import { getAlbumMetas, queryInLibrary } from "../api/platform";
import { getArtistMetas, getAudioFeatures } from "../api/spotify";
import { batchCacher } from "../extensions/cache";
import type { AlbumUnion } from "../types/graph_ql";
import type { Album, Artist, ContentsEpisode, ContentsTrack } from "../types/platform";
import type { LastFMMinifiedTrack, SpotifyMinifiedAlbum, SpotifyMinifiedTrack } from "../types/stats_types";
import { minifyAlbum, minifyArtist } from "./converter";

export const batchRequest = <T>(size: number, request: (batch: string[]) => Promise<T[]>) => {
	return (ids: string[]) => {
		const chunks = [];
		for (let i = 0; i < ids.length; i += size) {
			chunks.push(ids.slice(i, i + size));
		}

		return Promise.all(chunks.map((chunk) => request(chunk).catch(() => []))).then((res) => res.flat());
	};
};

export const getMeanAudioFeatures = async (ids: string[]) => {
	const audioFeaturesSum = {
		danceability: 0,
		energy: 0,
		speechiness: 0,
		acousticness: 0,
		instrumentalness: 0,
		liveness: 0,
		valence: 0,
		tempo: 0,
	};

	const audioFeaturesList = await batchCacher("features", batchRequest(100, getAudioFeatures))(ids);

	for (const audioFeatures of audioFeaturesList) {
		if (!audioFeatures) continue;
		for (const f of Object.keys(audioFeaturesSum) as (keyof typeof audioFeaturesSum)[]) {
			audioFeaturesSum[f] += audioFeatures[f];
		}
	}

	for (const f of Object.keys(audioFeaturesSum) as (keyof typeof audioFeaturesSum)[]) {
		audioFeaturesSum[f] /= audioFeaturesList.length;
	}

	return audioFeaturesSum;
};

export const minifyAlbumUnion = (album: AlbumUnion): SpotifyMinifiedAlbum => ({
	id: album.uri.split(":")[2],
	uri: album.uri,
	name: album.name,
	image: album.coverArt.sources[0]?.url,
	type: "spotify",
});

/**
 * Parses the raw album data and returns a list of the top 100 artists along with their frequencies and release years.
 * @param artistsRaw - The raw album data to be parsed.
 * @returns An object containing the top 100 albums with their frequencies and release years calculated from them.
 */
export const parseAlbums = async (albumsRaw: Album[]) => {
	const frequencyMap = {} as Record<string, number>;
	const albumURIs = albumsRaw.map((album) => album.uri);
	for (const uri of albumURIs) {
		frequencyMap[uri] = (frequencyMap[uri] || 0) + 1;
	}
	const uris = Object.keys(frequencyMap)
		.sort((a, b) => frequencyMap[b] - frequencyMap[a])
		.slice(0, 500);
	const albums = await batchCacher("album", getAlbumMetas)(uris);
	const releaseYears = {} as Record<string, number>;
	const uniqueAlbums = albums.map((album) => {
		if (album?.date?.isoString) {
			const year = new Date(album.date.isoString).getFullYear().toString();
			releaseYears[year] = (releaseYears[year] || 0) + frequencyMap[album.uri];
		}
		return { ...minifyAlbumUnion(album), frequency: frequencyMap[album.uri] };
	});
	return { releaseYears, albums: { contents: uniqueAlbums, length: Object.keys(frequencyMap).length } };
};

/**
 * Parses the raw artist data and returns a list of the top 250 artists along with their frequencies and genres.
 * @param artistsRaw - The raw artist data to be parsed.
 * @returns An object containing the top 250 artists with their frequencies and genres calculated from them.
 */
export const parseArtists = async (artistsRaw: Omit<Artist, "type">[]) => {
	const frequencyMap = {} as Record<string, number>;
	const artistIDs = artistsRaw.map((artist) => artist.uri.split(":")[2]);
	for (const id of artistIDs) {
		frequencyMap[id] = (frequencyMap[id] || 0) + 1;
	}
	const ids = Object.keys(frequencyMap)
		.sort((a, b) => frequencyMap[b] - frequencyMap[a])
		.slice(0, 250);
	const artists = await batchCacher("artist", batchRequest(50, getArtistMetas))(ids);
	const genres = {} as Record<string, number>;
	const uniqueArtists = artists.map((artist) => {
		for (const genre of artist.genres) {
			genres[genre] = (genres[genre] || 0) + frequencyMap[artist.id];
		}
		return { ...minifyArtist(artist), frequency: frequencyMap[artist.id] };
	});
	return { genres, artists: { contents: uniqueArtists, length: Object.keys(frequencyMap).length } };
};

export const parseTracks = async (tracks: (ContentsTrack | ContentsEpisode)[]) => {
	const trackIDs: string[] = [];
	const albumsRaw: Album[] = [];
	const artistsRaw: Artist[] = [];
	let explicit = 0;
	// let popularity = 0;
	let duration = 0;

	for (const track of tracks) {
		if (track?.type !== "track" || track.isLocal) continue;
		// popularity += track.popularity;
		duration += track.duration.milliseconds;
		explicit += track.isExplicit ? 1 : 0;
		trackIDs.push(track.uri.split(":")[2]);
		albumsRaw.push(track.album);
		artistsRaw.push(...track.artists);
	}

	explicit = explicit / trackIDs.length;
	// popularity = popularity / trackIDs.length;

	const audioFeatures = await getMeanAudioFeatures(trackIDs);
	const analysis = { ...audioFeatures, explicit };
	const { genres, artists } = await parseArtists(artistsRaw);
	const { releaseYears, albums } = await parseAlbums(albumsRaw);

	return {
		analysis,
		genres,
		artists,
		albums,
		releaseYears,
		duration,
		length: trackIDs.length,
	};
};

export const parseStat = (name: string) => {
	switch (name) {
		case "tempo":
			return (v: number) => `${Math.round(v)} bpm`;
		case "popularity":
			return (v: number) => `${Math.round(v)}%`;
		default:
			return (v: number) => `${Math.round(v * 100)}%`;
	}
};

export const parseLiked = async (tracks: (SpotifyMinifiedTrack | LastFMMinifiedTrack)[]) => {
	const trackURIs = tracks.filter((t) => t.type === "spotify").map((t) => t.uri);
	const liked = await queryInLibrary(trackURIs);
	const likedMap = new Map(trackURIs.map((id, i) => [id, liked[i]]));
	return tracks.map((t) => ({ ...t, liked: t.type === "spotify" ? (likedMap.get(t.uri) as boolean) : false }));
};
