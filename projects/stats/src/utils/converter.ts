import { searchForAlbum, searchForArtist, searchForTrack } from "../api/spotify";
import { cacher, set } from "../extensions/cache";
import type * as LastFM from "../types/lastfm";
import type * as Spotify from "../types/spotify";
import { getArtistTopAlbumImage, getLastFmImageUrl, getTrackAlbumImage } from "../api/lastfm";
import type {
	LastFMMinifiedAlbum,
	LastFMMinifiedArtist,
	LastFMMinifiedTrack,
	SpotifyMinifiedAlbum,
	SpotifyMinifiedArtist,
	SpotifyMinifiedTrack,
} from "../types/stats_types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ThrottledMapOptions = {
	batchSize?: number;
	delayMs?: number;
};

const THROTTLED_BATCH_SIZE = 2;
const THROTTLED_DELAY_MS = 250;
export const throttledMap = async <T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	options: ThrottledMapOptions = {},
): Promise<R[]> => {
	const { batchSize = 1, delayMs = 0 } = options;
	const results: R[] = [];
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		results.push(...(await Promise.all(batch.map((item) => fn(item)))));
		if (delayMs > 0 && i + batchSize < items.length) {
			await delay(delayMs);
		}
	}
	return results;
};

export const getThrottledMapOptions = (lastfmOnly: boolean): ThrottledMapOptions => {
	if (lastfmOnly) {
		return { batchSize: 8, delayMs: 0 };
	}

	return { batchSize: THROTTLED_BATCH_SIZE, delayMs: THROTTLED_DELAY_MS };
};

export const minifyArtist = (artist: Spotify.Artist): SpotifyMinifiedArtist => ({
	id: artist.id,
	name: artist.name,
	image: artist.images?.at(0)?.url,
	uri: artist.uri,
	genres: artist.genres,
	type: "spotify",
});

export const minifyAlbum = (album: Spotify.SimplifiedAlbum): SpotifyMinifiedAlbum => ({
	id: album.id,
	uri: album.uri,
	name: album.name,
	image: album.images[0]?.url,
	type: "spotify",
});

export const minifyTrack = (track: Spotify.Track): SpotifyMinifiedTrack => ({
	id: track.id,
	uri: track.uri,
	name: track.name,
	duration_ms: track.duration_ms,
	popularity: track.popularity,
	explicit: track.explicit,
	image: track.album.images.at(-1)?.url,
	artists: track.artists.map((artist) => ({
		name: artist.name,
		uri: artist.uri,
	})),
	album: {
		name: track.album.name,
		uri: track.album.uri,
		release_date: track.album.release_date,
	},
	type: "spotify",
});

const getArtistFallbackImage = async (artist: LastFM.Artist, lastfmApiKey?: string) => {
	const directImage = getLastFmImageUrl(artist.image);
	if (directImage || !lastfmApiKey) return directImage;

	const resolvedImage = await cacher(() => getArtistTopAlbumImage(lastfmApiKey, artist.name))({
		queryKey: ["lfmArtistTopAlbumImage", artist.name],
	});
	return resolvedImage ?? undefined;
};

const getTrackFallbackImage = async (track: LastFM.Track, lastfmApiKey?: string) => {
	const directImage = getLastFmImageUrl(track.image);
	if (directImage || !lastfmApiKey) return directImage;

	const resolvedImage = await cacher(() => getTrackAlbumImage(lastfmApiKey, track.artist.name, track.name))({
		queryKey: ["lfmTrackAlbumImage", track.artist.name, track.name],
	});
	return resolvedImage ?? undefined;
};

// Pure LastFM artist without Spotify lookup - avoids API calls entirely
export const convertArtistLastFMOnly = (artist: LastFM.Artist): LastFMMinifiedArtist => ({
	name: artist.name,
	playcount: Number(artist.playcount),
	uri: artist.url,
	image: getLastFmImageUrl(artist.image),
	type: "lastfm",
});


export const convertArtist = async (artist: LastFM.Artist, lastfmOnly = false, lastfmApiKey?: string) => {
	// Skip Spotify lookup if lastfm-only mode is enabled
	const fallbackImage = await getArtistFallbackImage(artist, lastfmApiKey);
	if (lastfmOnly) return { ...convertArtistLastFMOnly(artist), image: fallbackImage };


	let spotifyArtist;
	try {
		spotifyArtist = await cacher(async () => {
			const searchRes = await searchForArtist(artist.name);
			const spotifyArtists = searchRes.filter(
				(a) => a.name.localeCompare(artist.name, undefined, { sensitivity: "base" }) === 0,
			);
			return spotifyArtists.sort((a, b) => b.popularity - a.popularity)[0];
		})({ queryKey: ["searchForArtist", artist.name] });
	} catch {
		return { ...convertArtistLastFMOnly(artist), image: fallbackImage };
	}
	if (!spotifyArtist) return { ...convertArtistLastFMOnly(artist), image: fallbackImage };
	set(`artist-${spotifyArtist.id}`, spotifyArtist);
	const minifiedArtist = minifyArtist(spotifyArtist);
	return {
		...minifiedArtist,
		playcount: Number(artist.playcount),
		name: artist.name,
		image: minifiedArtist.image ?? fallbackImage,
	} as SpotifyMinifiedArtist;
};

// Pure LastFM album without Spotify lookup - avoids API calls entirely
export const convertAlbumLastFMOnly = (album: LastFM.Album): LastFMMinifiedAlbum => ({
	uri: album.url,
	name: album.name,
	playcount: Number(album.playcount),
	image: getLastFmImageUrl(album.image),
	type: "lastfm",
});

export const convertAlbum = async (album: LastFM.Album, lastfmOnly = false) => {
	// Skip Spotify lookup if lastfm-only mode is enabled
	if (lastfmOnly) return convertAlbumLastFMOnly(album);

	const fallbackImage = getLastFmImageUrl(album.image);

	let spotifyAlbum;
	try {
		spotifyAlbum = await cacher(async () => {
			const searchRes = await searchForAlbum(album.name, album.artist.name);
			return searchRes.find((a) => a.name.localeCompare(album.name, undefined, { sensitivity: "base" }) === 0);
		})({
			queryKey: ["searchForAlbum", album.name, album.artist.name],
		});
	} catch {
		return convertAlbumLastFMOnly(album);
	}
	if (!spotifyAlbum) {
		return {
			...convertAlbumLastFMOnly(album),
			image: fallbackImage,
		};
	}
	const minifiedAlbum = minifyAlbum(spotifyAlbum);
	return {
		...minifiedAlbum,
		playcount: Number(album.playcount),
		name: album.name,
		image: minifiedAlbum.image ?? fallbackImage,
	} as SpotifyMinifiedAlbum;
};

// Pure LastFM track without Spotify lookup - avoids API calls entirely
export const convertTrackLastFMOnly = (track: LastFM.Track): LastFMMinifiedTrack => ({
	uri: track.url,
	name: track.name,
	playcount: Number(track.playcount),
	duration_ms: Number(track.duration) * 1000,
	image: getLastFmImageUrl(track.image),
	artists: [
		{
			name: track.artist.name,
			uri: track.artist.url,
		},
	],
	type: "lastfm",
});


export const convertTrack = async (track: LastFM.Track, lastfmOnly = false, lastfmApiKey?: string) => {
	// Skip Spotify lookup if lastfm-only mode is enabled
	const fallbackImage = await getTrackFallbackImage(track, lastfmApiKey);
	if (lastfmOnly) return { ...convertTrackLastFMOnly(track), image: fallbackImage };


	let spotifyTrack;
	try {
		spotifyTrack = await cacher(async () => {
			const searchRes = await searchForTrack(track.name, track.artist.name);
			return searchRes.find((t) => t.name.localeCompare(track.name, undefined, { sensitivity: "base" }) === 0);
		})({
			queryKey: ["searchForTrack", track.name, track.artist.name],
		});
	} catch {
		return { ...convertTrackLastFMOnly(track), image: fallbackImage };
	}
	if (!spotifyTrack) return { ...convertTrackLastFMOnly(track), image: fallbackImage };
	const minifiedTrack = minifyTrack(spotifyTrack);
	return {
		...minifiedTrack,
		playcount: Number(track.playcount),
		name: track.name,
		image: minifiedTrack.image ?? fallbackImage,
	} as SpotifyMinifiedTrack;
};
