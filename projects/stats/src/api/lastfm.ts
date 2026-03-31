import type * as LastFM from "../types/lastfm";
import { apiFetch } from "./spotify";

type LastFmImage = {
	"#text": string;
};

type ArtistTopAlbumsResponse = {
	topalbums?: {
		album?: {
			image?: LastFmImage[];
		}[];
	};
};

type TrackInfoResponse = {
	track?: {
		album?: {
			image?: LastFmImage[];
		};
	};
};

const LASTFM_PLACEHOLDER_HASHES = [
	"2a96cbd8b46e442fc41c2b86b821562f",
	"c6f59c1e5e7240a4c0d427abd71f3dbb",
];

const toHttpsUrl = (url?: string) => (url ? url.replace(/^http:\/\//i, "https://") : undefined);

const isPlaceholderImage = (url?: string) =>
	Boolean(url && LASTFM_PLACEHOLDER_HASHES.some((hash) => url.includes(hash)));

export const getLastFmImageUrl = (images?: LastFmImage[]) => {
	if (!images?.length) return undefined;
	const image = [...images].reverse().find((entry) => entry?.["#text"]?.trim());
	const url = toHttpsUrl(image?.["#text"]);
	return isPlaceholderImage(url) ? undefined : url;
};

const lfmperiods = {
	extra_short_term: "7day",
	short_term: "1month",
	medium_term: "6month",
	long_term: "overall",
} as const;

const val = <T>(res: T | undefined) => {
	if (!res || (Array.isArray(res) && !res.length)) throw new Error("Lastfm returned an empty result. Try again later.");
	return res;
};

export const getTopTracks = async (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(key)}&limit=100&format=json&period=${lfmperiods[range]}`;
	const res = await apiFetch<LastFM.TopTracksResponse>("lfmTopTracks", url);
	return val(res?.toptracks?.track);
};

export const getTopArtists = async (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(key)}&limit=100&format=json&period=${lfmperiods[range]}`;
	const res = await apiFetch<LastFM.TopArtistsResponse>("lfmTopArtists", url);
	return val(res?.topartists?.artist);
};

export const getTopAlbums = async (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(key)}&limit=100&format=json&period=${lfmperiods[range]}`;
	const res = await apiFetch<LastFM.TopAlbumsResponse>("lfmTopAlbums", url);
	return val(res?.topalbums?.album);
};

export const getArtistChart = async (key: string) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${encodeURIComponent(key)}&format=json`;
	const res = await apiFetch<LastFM.ArtistChartResponse>("lfmArtistChart", url);
	return val(res?.artists?.artist);
};

export const getTrackChart = async (key: string) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${encodeURIComponent(key)}&format=json`;
	const res = await apiFetch<LastFM.TrackChartResponse>("lfmTrackChart", url);
	return val(res?.tracks?.track);
};

export const getArtistTopAlbumImage = async (key: string, artist: string) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(key)}&autocorrect=1&limit=1&format=json`;
	const response = await apiFetch<ArtistTopAlbumsResponse>("lfmArtistTopAlbumImage", url, false);
	return getLastFmImageUrl(response?.topalbums?.album?.[0]?.image) ?? null;
};

export const getTrackAlbumImage = async (key: string, artist: string, track: string) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${encodeURIComponent(key)}&autocorrect=1&format=json`;
	const response = await apiFetch<TrackInfoResponse>("lfmTrackAlbumImage", url, false);
	return getLastFmImageUrl(response?.track?.album?.image) ?? null;
};

export const getArtistTopTags = async (key: string, artist: string) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTags&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(key)}&format=json`;
	const response = await apiFetch<LastFM.ArtistTopTagsResponse>("lfmArtistTopTags", url, false);
	return (response?.toptags?.tag ?? [])
		.map((tag) => ({
			name: tag.name,
			count: Number(tag.count) || 0,
		}))
		.filter((tag) => tag.name);
};

export const getArtistInfo = async (key: string, artist: string, username?: string) => {
	let url = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(key)}&format=json`;
	if (username) url += `&username=${encodeURIComponent(username)}`;
	const res = await apiFetch<LastFM.ArtistInfoResponse>("lfmArtistInfo", url, false);
	return res?.artist ?? null;
};

export const getArtistGlobalTopTracks = async (key: string, artist: string, limit = 50, skipArtworkEnrichment = false) => {
	const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTracks&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(key)}&limit=${limit}&format=json`;
	const res = await apiFetch<LastFM.ArtistTopTracksResponse>("lfmArtistTopTracks", url, false);
	const tracks = (res?.toptracks?.track ?? []).map((track) => ({
		name: track.name,
		playcount: track.playcount,
		listeners: track.listeners,
		url: track.url,
		artist: track.artist,
		imageUrl: getLastFmImageUrl(track.image),
	}));

	// Enrich tracks that have no album art via track.getInfo (batched).
	// Skipped when caller will fetch track.getInfo anyway (e.g. getUserTopTracksForArtist).
	if (!skipArtworkEnrichment) {
		const needsArt = tracks.filter((t) => !t.imageUrl);
		if (needsArt.length > 0) {
			const CONCURRENCY = 5;
			for (let i = 0; i < needsArt.length; i += CONCURRENCY) {
				const batch = needsArt.slice(i, i + CONCURRENCY);
				const results = await Promise.allSettled(
					batch.map(async (track) => {
						const cacheKey = `lfmTrackInfo:${artist}:${track.name}`;
						const infoUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track.name)}&api_key=${encodeURIComponent(key)}&autocorrect=1&format=json`;
						const info = await apiFetch<{ track?: { album?: { image?: LastFmImage[] } } }>(cacheKey, infoUrl, false);
						return { track, imageUrl: getLastFmImageUrl(info?.track?.album?.image) };
					}),
				);
				for (const r of results) {
					if (r.status === "fulfilled" && r.value.imageUrl) {
						r.value.track.imageUrl = r.value.imageUrl;
					}
				}
			}
		}
	}

	return tracks;
};

export const getUserTopTracksForArtist = async (
	key: string,
	artist: string,
	username: string,
	limit = 20,
): Promise<{ name: string; url: string; userPlaycount: number; imageUrl?: string }[]> => {
	// Fetch artist's global top tracks (skip artwork enrichment — we fetch
	// track.getInfo with username below, which also returns album art)
	const globalTracks = await getArtistGlobalTopTracks(key, artist, limit, true);
	if (!globalTracks.length) return [];

	// Enrich each track with user play count via track.getInfo
	const CONCURRENCY = 5;
	const results: { name: string; url: string; userPlaycount: number; imageUrl?: string }[] = [];

	for (let i = 0; i < globalTracks.length; i += CONCURRENCY) {
		const batch = globalTracks.slice(i, i + CONCURRENCY);
		const batchResults = await Promise.allSettled(
			batch.map(async (track) => {
				const cacheKey = `lfmTrackUserInfo:${artist}:${track.name}`;
				const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track.name)}&username=${encodeURIComponent(username)}&api_key=${encodeURIComponent(key)}&autocorrect=1&format=json`;
				const res = await apiFetch<{ track?: { userplaycount?: string; url?: string; album?: { image?: LastFmImage[] } } }>(cacheKey, url, false);
				return {
					name: track.name,
					url: track.url,
					userPlaycount: Number(res?.track?.userplaycount ?? 0),
					imageUrl: getLastFmImageUrl(res?.track?.album?.image) ?? track.imageUrl,
				};
			}),
		);
		for (const r of batchResults) {
			if (r.status === "fulfilled" && r.value.userPlaycount > 0) {
				results.push(r.value);
			}
		}
	}

	return results.sort((a, b) => b.userPlaycount - a.userPlaycount);
};
