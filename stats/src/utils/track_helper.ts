import { getArtistMetas, getAudioFeatures } from "../api/spotify";
import type { Artist, PlaylistTrack, SimplifiedAlbum, SimplifiedArtist } from "../types/spotify";
import type { SpotifyMinifiedAlbum, SpotifyMinifiedArtist } from "../types/stats_types";
import { minifyAlbum, minifyArtist } from "./converter";

export const batchRequest = <T>(size: number, request: (batch: string[]) => Promise<T[]>) => {
	return (ids: string[]) => {
		const chunks = [];
		for (let i = 0; i < ids.length; i += size) {
			chunks.push(ids.slice(i, i + size));
		}

		return Promise.all(chunks.map(request)).then((res) => res.flat());
	};
};

export const getMeanAudioFeatures = async (ids: string[]) => {
	const audioFeaturesSum = {
		danceability: 0,
		energy: 0,
		loudness: 0,
		speechiness: 0,
		acousticness: 0,
		instrumentalness: 0,
		liveness: 0,
		valence: 0,
		tempo: 0,
	};

	const audioFeaturesList = await batchRequest(50, (batch) => getAudioFeatures(batch))(ids);

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

export const parseAlbums = (albums: SimplifiedAlbum[]) => {
	const releaseYears = {} as Record<string, number>;
	const uniqueAlbums = albums.reduce(
		(acc, album) => {
			const year = album.release_date.slice(0, 4);
			releaseYears[year] = (releaseYears[year] || 0) + 1;
			acc[album.id] = { ...minifyAlbum(album), frequency: (acc[album.id]?.frequency || 0) + 1 };
			return acc;
		},
		{} as Record<string, SpotifyMinifiedAlbum & { frequency: number }>,
	);
	return { releaseYears, albums: Object.values(uniqueAlbums).sort((a, b) => b.frequency - a.frequency) };
};

export const parseArtists = async (artistsRaw: SimplifiedArtist[]) => {
	const artists = await batchRequest(50, getArtistMetas)(artistsRaw.map((artist) => artist.id));
	const genres = {} as Record<string, number>;
	const uniqueArtists = artists.reduce(
		(acc, artist) => {
			for (const genre of artist.genres) {
				genres[genre] = (genres[genre] || 0) + 1;
			}
			acc[artist.id] = { ...minifyArtist(artist), frequency: (acc[artist.id]?.frequency || 0) + 1 };
			return acc;
		},
		{} as Record<string, SpotifyMinifiedArtist & { frequency: number }>,
	);
	return { genres, artists: Object.values(uniqueArtists).sort((a, b) => b.frequency - a.frequency) };
};

export const parseTracks = async (tracks: PlaylistTrack[]) => {
	const trackIDs: string[] = [];
	const albumsRaw: SimplifiedAlbum[] = [];
	const artistsRaw: SimplifiedArtist[] = [];
	let explicit = 0;
	let popularity = 0;
	let duration = 0;

	for (const { track } of tracks) {
		if (track?.type !== "track" || track.is_local) continue;
		popularity += track.popularity;
		duration += track.duration_ms;
		explicit += track.explicit ? 1 : 0;
		trackIDs.push(track.id);
		albumsRaw.push(track.album);
		artistsRaw.push(...track.artists);
	}

	explicit = explicit / trackIDs.length;
	popularity = popularity / trackIDs.length;

	const audioFeatures = await getMeanAudioFeatures(trackIDs);
	const analysis = { ...audioFeatures, popularity, explicit };
	const { genres, artists } = await parseArtists(artistsRaw);
	const { releaseYears, albums } = parseAlbums(albumsRaw);

	return {
		analysis,
		genres,
		artists,
		albums: albums.slice(0, 10),
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
