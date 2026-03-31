import { getAlbumMetas, queryInLibrary } from "../api/platform";
import { getArtistMetas, getAudioFeatures, isSuppressedSpotifyError } from "../api/spotify";
import { batchCacher } from "../extensions/cache";
import type { AlbumUnion } from "../types/graph_ql";
import type { Album, Artist, ContentsEpisode, ContentsTrack } from "@shared/types/platform";
import { getArtistTopTags } from "../api/lastfm";
import { getArtistGenres as getMusicBrainzGenres } from "../api/musicbrainz";
import type { Config, LastFMMinifiedTrack, SpotifyMinifiedAlbum, SpotifyMinifiedTrack } from "../types/stats_types";
import { minifyAlbum, minifyArtist } from "./converter";

export const batchRequest = <T>(size: number, request: (batch: string[]) => Promise<T[]>) => {
	return async (ids: string[]) => {
		const chunks = [];
		for (let i = 0; i < ids.length; i += size) {
			chunks.push(ids.slice(i, i + size));
		}

		const results: (T | undefined)[] = [];
		for (const chunk of chunks) {
			try {
				const chunkResults = await request(chunk);
				results.push(...chunk.map((_, index) => chunkResults[index]));
			} catch (error) {
				results.push(...chunk.map(() => undefined));
				if (isSuppressedSpotifyError(error)) break;
			}
		}

		return results;
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
	const unavailableFeatures = {
		danceability: Number.NaN,
		energy: Number.NaN,
		speechiness: Number.NaN,
		acousticness: Number.NaN,
		instrumentalness: Number.NaN,
		liveness: Number.NaN,
		valence: Number.NaN,
		tempo: Number.NaN,
	};

	if (ids.length === 0) return unavailableFeatures;

	const audioFeaturesList = await batchCacher("features", batchRequest(100, getAudioFeatures))(ids);
	if (audioFeaturesList.length === 0) return unavailableFeatures;
	let availableFeatureCount = 0;

	for (const audioFeatures of audioFeaturesList) {
		if (!audioFeatures) continue;
		availableFeatureCount += 1;
		for (const f of Object.keys(audioFeaturesSum) as (keyof typeof audioFeaturesSum)[]) {
			audioFeaturesSum[f] += audioFeatures[f];
		}
	}

	if (availableFeatureCount === 0) return unavailableFeatures;

	const divisor = availableFeatureCount;
	for (const f of Object.keys(audioFeaturesSum) as (keyof typeof audioFeaturesSum)[]) {
		audioFeaturesSum[f] /= divisor;
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

const normalizeName = (value: string) => value.trim().toLocaleLowerCase();

const addToGenreMap = (target: Record<string, number>, genre: string, value: number) => {
	const normalized = normalizeName(genre);
	if (!normalized) return;
	target[normalized] = (target[normalized] || 0) + value;
};

const recordFallbackArtistImage = (
	target: Map<string, Map<string, number>>,
	artistId: string,
	imageUrl: string | undefined,
) => {
	if (!imageUrl) return;

	const imageCounts = target.get(artistId) ?? new Map<string, number>();
	imageCounts.set(imageUrl, (imageCounts.get(imageUrl) ?? 0) + 1);
	target.set(artistId, imageCounts);
};

const getMostFrequentArtistImage = (imageCounts?: Map<string, number>) => {
	if (!imageCounts || imageCounts.size === 0) return undefined;

	return [...imageCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
};

const enrichGenresFromArtistNames = async (
	artists: { name: string; weight: number }[],
	config?: Config,
	currentGenres: Record<string, number> = {},
) => {
	const genres = { ...currentGenres };
	const topArtists = artists.slice(0, 25);

	const CONCURRENCY = 5;

	const runPool = async <T>(items: T[], fn: (item: T) => Promise<void>) => {
		let i = 0;
		const next = async (): Promise<void> => {
			while (i < items.length) {
				const item = items[i++];
				await fn(item);
			}
		};
		await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next()));
	};

	if (Object.keys(genres).length === 0 && config?.["api-key"]) {
		await runPool(topArtists, async (artist) => {
			try {
				const tags = await getArtistTopTags(config["api-key"], artist.name);
				const maxCount = Math.max(tags[0]?.count ?? 0, 1);
				for (const tag of tags.slice(0, 5)) {
					addToGenreMap(genres, tag.name, artist.weight * Math.max(0.15, tag.count / maxCount));
				}
			} catch {
				// skip failed artists
			}
		});
	}

	if (config?.["use-musicbrainz-genres"]) {
		await runPool(topArtists.slice(0, 20), async (artist) => {
			try {
				const tags = await getMusicBrainzGenres(artist.name);
				const maxCount = Math.max(tags[0]?.count ?? 0, 1);
				for (const tag of tags.slice(0, 5)) {
					addToGenreMap(genres, tag.name, artist.weight * Math.max(0.15, (tag.count ?? 0) / maxCount));
				}
			} catch {
				// skip failed artists
			}
		});
	}

	return genres;
};

const minifyRawAlbum = (album: Album): SpotifyMinifiedAlbum => ({
	id: album.uri.split(":")[2],
	uri: album.uri,
	name: album.name,
	image: album.images[0]?.url,
	type: "spotify",
});

/**
 * Parses the raw album data and returns a list of the top 100 artists along with their frequencies and release years.
 * @param artistsRaw - The raw album data to be parsed.
 * @returns An object containing the top 100 albums with their frequencies and release years calculated from them.
 */
export const parseAlbums = async (albumsRaw: Album[]) => {
	const frequencyMap = {} as Record<string, number>;
	const rawAlbumMap = new Map<string, Album>();
	const albumURIs = albumsRaw.map((album) => album.uri);
	for (const album of albumsRaw) {
		const uri = album.uri;
		frequencyMap[uri] = (frequencyMap[uri] || 0) + 1;
		if (!rawAlbumMap.has(uri)) rawAlbumMap.set(uri, album);
	}
	const uris = Object.keys(frequencyMap)
		.sort((a, b) => frequencyMap[b] - frequencyMap[a])
		.slice(0, 500);
	const albums = await batchCacher("album", getAlbumMetas)(uris);
	const releaseYears = {} as Record<string, number>;
	const albumMap = new Map(
		albums
			.filter((album): album is NonNullable<(typeof albums)[number]> => Boolean(album))
			.map((album) => [album.uri, album]),
	);
	const uniqueAlbums = uris.map((uri) => {
		const album = albumMap.get(uri);
		if (album?.date?.isoString) {
			const year = new Date(album.date.isoString).getFullYear().toString();
			releaseYears[year] = (releaseYears[year] || 0) + frequencyMap[album.uri];
		}

		if (album) return { ...minifyAlbumUnion(album), frequency: frequencyMap[album.uri] };

		const rawAlbum = rawAlbumMap.get(uri);
		if (!rawAlbum) return null;
		return { ...minifyRawAlbum(rawAlbum), frequency: frequencyMap[uri] };
	});
	return {
		releaseYears,
		albums: { contents: uniqueAlbums.filter(Boolean), length: Object.keys(frequencyMap).length },
	};
};

/**
 * Parses the raw artist data and returns a list of the top 250 artists along with their frequencies and genres.
 * @param artistsRaw - The raw artist data to be parsed.
 * @returns An object containing the top 250 artists with their frequencies and genres calculated from them.
 */
export const parseArtists = async (
	artistsRaw: Omit<Artist, "type">[],
	config?: Config,
	fallbackImages?: Map<string, string>,
) => {
	const frequencyMap = {} as Record<string, number>;
	const rawArtistMap = new Map<string, Omit<Artist, "type">>();
	const artistIDs = artistsRaw.map((artist) => artist.uri.split(":")[2]);
	for (const artist of artistsRaw) {
		const id = artist.uri.split(":")[2];
		frequencyMap[id] = (frequencyMap[id] || 0) + 1;
		if (!rawArtistMap.has(id)) rawArtistMap.set(id, artist);
	}
	const ids = Object.keys(frequencyMap)
		.sort((a, b) => frequencyMap[b] - frequencyMap[a])
		.slice(0, 250);
	if (ids.length === 0) return { genres: {}, artists: { contents: [], length: 0 } };
	const artists = await batchCacher("artist", batchRequest(50, getArtistMetas))(ids);
	const genres = {} as Record<string, number>;
	const artistMap = new Map(
		artists
			.filter((artist): artist is NonNullable<(typeof artists)[number]> => Boolean(artist))
			.map((artist) => [artist.id, artist]),
	);
	const fallbackSignals = ids.map((id) => ({
		name: rawArtistMap.get(id)?.name ?? "",
		weight: frequencyMap[id],
	}));
	const uniqueArtists = ids
		.map((id) => {
			const artist = artistMap.get(id);
			if (artist) {
				for (const genre of artist.genres) {
					genres[genre] = (genres[genre] || 0) + frequencyMap[artist.id];
				}
				return { ...minifyArtist(artist), frequency: frequencyMap[artist.id] };
			}

			const rawArtist = rawArtistMap.get(id);
			if (!rawArtist) return null;
			return {
				id,
				name: rawArtist.name,
				uri: rawArtist.uri,
				image: fallbackImages?.get(id),
				genres: [],
				type: "spotify" as const,
				frequency: frequencyMap[id],
			};
		})
		.filter(Boolean);

	const enrichedGenres = await enrichGenresFromArtistNames(fallbackSignals.filter((artist) => artist.name), config, genres);
	return { genres: enrichedGenres, artists: { contents: uniqueArtists, length: Object.keys(frequencyMap).length } };
};

export const parseTracks = async (tracks: (ContentsTrack | ContentsEpisode)[], config?: Config) => {
	const trackIDs: string[] = [];
	const albumsRaw: Album[] = [];
	const artistsRaw: Artist[] = [];
	const fallbackArtistImageCounts = new Map<string, Map<string, number>>();
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

		const albumImage = track.album.images[0]?.url;
		for (const artist of track.artists) {
			recordFallbackArtistImage(fallbackArtistImageCounts, artist.uri.split(":")[2], albumImage);
		}
	}

	if (trackIDs.length === 0) {
		return {
			analysis: await getMeanAudioFeatures([]),
			genres: {},
			artists: { contents: [], length: 0 },
			albums: { contents: [], length: 0 },
			releaseYears: {},
			duration,
			length: 0,
		};
	}

	explicit = explicit / trackIDs.length;
	// popularity = popularity / trackIDs.length;

	const audioFeatures = await getMeanAudioFeatures(trackIDs);
	const analysis = { ...audioFeatures, explicit };
	const fallbackArtistImages = new Map(
		[...fallbackArtistImageCounts.entries()]
			.map(([artistId, imageCounts]) => [artistId, getMostFrequentArtistImage(imageCounts)] as const)
			.filter((entry): entry is [string, string] => Boolean(entry[1])),
	);
	const { genres, artists } = await parseArtists(artistsRaw, config, fallbackArtistImages);
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
	const unavailable = (value: number) => !Number.isFinite(value);

	switch (name) {
		case "tempo":
			return (v: number) => (unavailable(v) ? "Unavailable" : `${Math.round(v)} bpm`);
		case "popularity":
			return (v: number) => (unavailable(v) ? "Unavailable" : `${Math.round(v)}%`);
		default:
			return (v: number) => (unavailable(v) ? "Unavailable" : `${Math.round(v * 100)}%`);
	}
};

export const parseLiked = async (tracks: (SpotifyMinifiedTrack | LastFMMinifiedTrack)[]) => {
	const trackURIs = tracks.filter((t) => t.type === "spotify").map((t) => t.uri);
	const liked = await queryInLibrary(trackURIs);
	const likedMap = new Map(trackURIs.map((id, i) => [id, liked[i]]));
	return tracks.map((t) => ({ ...t, liked: t.type === "spotify" ? (likedMap.get(t.uri) as boolean) : false }));
};
