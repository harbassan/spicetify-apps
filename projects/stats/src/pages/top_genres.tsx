import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import StatCard from "../components/cards/stat_card";
import ChartCard from "../components/cards/chart_card";
import InlineGrid from "../components/inline_grid";
import PageContainer from "@shared/components/page_container";
import Shelf from "../components/shelf";
import { DropdownOptions } from "./top_artists";
import { getTopArtists } from "./top_artists";
import { getTopTracks } from "./top_tracks";
import type {
	Config,
	ConfigWrapper,
	LastFMMinifiedArtist,
	LastFMMinifiedTrack,
	SpotifyMinifiedArtist,
	SpotifyMinifiedTrack,
} from "../types/stats_types";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";
import type { SpotifyRange } from "../types/spotify";
import { getMeanAudioFeatures, batchRequest, parseStat } from "../utils/track_helper";
import { useQuery } from "@shared/types/react_query";
import useStatus from "@shared/status/useStatus";
import { batchCacher, cacher, invalidator } from "../extensions/cache";
import { runOptionalEnrichment } from "../extensions/optional_enrichment";
import { getArtistMetas } from "../api/spotify";
import { getArtistTopTags } from "../api/lastfm";
import { getArtistGenres as getMusicBrainzGenres } from "../api/musicbrainz";
import { getConfigCacheKey } from "../utils/config_cache";

type GenreTag = {
	count: number;
	name: string;
};

type ArtistSignal = {
	name: string;
	spotifyId?: string;
	weight: number;
};

const normalizeGenreName = (value: string) => value.trim().toLocaleLowerCase();

const getRankWeight = (index: number, total: number, playcount?: number) => {
	if (typeof playcount === "number" && playcount > 0) return playcount;
	return Math.max(1, total - index);
};

const addToGenreMap = (target: Record<string, number>, genre: string, value: number) => {
	const normalized = normalizeGenreName(genre);
	if (!normalized) return;
	target[normalized] = (target[normalized] || 0) + value;
};

const addArtistSignal = (target: Map<string, ArtistSignal>, name: string, weight: number, spotifyId?: string) => {
	const normalizedName = normalizeGenreName(name);
	if (!normalizedName || weight <= 0) return;

	const current = target.get(normalizedName);
	target.set(normalizedName, {
		name,
		spotifyId: spotifyId ?? current?.spotifyId,
		weight: (current?.weight ?? 0) + weight,
	});
};

const mergeGenreMaps = (...maps: Record<string, number>[]) => {
	const merged: Record<string, number> = {};
	for (const map of maps) {
		for (const [genre, value] of Object.entries(map)) {
			merged[genre] = (merged[genre] || 0) + value;
		}
	}
	return merged;
};

const buildArtistSignals = (
	tracks: (SpotifyMinifiedTrack | LastFMMinifiedTrack)[],
	artists: (SpotifyMinifiedArtist | LastFMMinifiedArtist)[],
) => {
	const signals = new Map<string, ArtistSignal>();

	tracks.forEach((track, index) => {
		const weight = getRankWeight(index, tracks.length, track.playcount);
		const artistWeight = weight / Math.max(1, track.artists.length);
		track.artists.forEach((artist) => {
			const spotifyId = artist.uri?.startsWith("spotify:artist:") ? artist.uri.split(":")[2] : undefined;
			addArtistSignal(signals, artist.name, artistWeight, spotifyId);
		});
	});

	artists.forEach((artist, index) => {
		const weight = getRankWeight(index, artists.length, artist.playcount);
		const spotifyId = artist.type === "spotify" ? artist.id : undefined;
		addArtistSignal(signals, artist.name, weight, spotifyId);
	});

	return [...signals.values()].sort((left, right) => right.weight - left.weight);
};

const getSpotifyGenres = async (signals: ArtistSignal[]) => {
	const spotifySignals = signals.filter((signal) => signal.spotifyId).slice(0, 50);
	if (spotifySignals.length === 0) return {} as Record<string, number>;

	const ids = spotifySignals.map((signal) => signal.spotifyId as string);
	const weightById = new Map(spotifySignals.map((signal) => [signal.spotifyId as string, signal.weight]));
	const artists = await batchCacher("artist", batchRequest(50, getArtistMetas))(ids);
	const genres: Record<string, number> = {};

	artists.filter(Boolean).forEach((artist) => {
		const weight = weightById.get(artist.id) ?? 0;
		artist.genres.forEach((genre) => addToGenreMap(genres, genre, weight));
	});

	return genres;
};

const enrichWithTagSource = async (
	signals: ArtistSignal[],
	source: string,
	lookup: (artist: string) => Promise<GenreTag[]>,
	limit: number,
) => {
	const genres: Record<string, number> = {};
	const targets = signals.slice(0, limit);
	const resolvedTags = await Promise.all(
		targets.map(async (signal) => {
			try {
				const tags = await runOptionalEnrichment({
					key: `${source}:${normalizeGenreName(signal.name)}`,
					label: `${source} tags for ${signal.name}`,
					task: () => lookup(signal.name),
				});
				return { signal, tags };
			} catch {
				return { signal, tags: [] as GenreTag[] };
			}
		}),
	);

	for (const { signal, tags } of resolvedTags) {
		const topCount = Math.max(tags[0]?.count ?? 0, 1);
		for (const tag of tags.slice(0, 5)) {
			const scale = Math.max(0.15, tag.count / topCount);
			addToGenreMap(genres, tag.name, signal.weight * scale);
		}
	}

	return genres;
};

const parseAlbums = (albums: SpotifyMinifiedTrack["album"][]) => {
	const releaseYears = {} as Record<string, number>;
	for (const album of albums) {
		const year = album.release_date.slice(0, 4);
		releaseYears[year] = (releaseYears[year] || 0) + 1;
	}
	return releaseYears;
};

const parseTracks = async (
	tracks: (SpotifyMinifiedTrack | LastFMMinifiedTrack)[],
	topArtists: (SpotifyMinifiedArtist | LastFMMinifiedArtist)[],
	config: Config,
) => {
	const trackIDs: string[] = [];
	const albumsRaw: SpotifyMinifiedTrack["album"][] = [];
	let explicit = 0;
	let popularity = 0;

	for (const track of tracks) {
		if (track.type !== "spotify") continue;
		popularity += track.popularity;
		explicit += track.explicit ? 1 : 0;
		trackIDs.push(track.id);
		albumsRaw.push(track.album);
	}

	const artistSignals = buildArtistSignals(tracks, topArtists);

	const analysis =
		trackIDs.length === 0
			? { ...(await getMeanAudioFeatures([])), popularity: Number.NaN, explicit: Number.NaN }
			: await (async () => {
				explicit = explicit / trackIDs.length;
				popularity = popularity / trackIDs.length;
				const audioFeatures = await getMeanAudioFeatures(trackIDs);
				return { ...audioFeatures, popularity, explicit };
			})();
	const spotifyGenres = await getSpotifyGenres(artistSignals);
	const shouldUseLastFmFallback = Object.keys(spotifyGenres).length === 0 && Boolean(config["api-key"]);
	const lastFmGenres = shouldUseLastFmFallback
		? await enrichWithTagSource(
				artistSignals,
				"Last.fm",
				(artist) => getArtistTopTags(config["api-key"] as string, artist),
				25,
			)
		: {};
	const musicBrainzGenres = config["use-musicbrainz-genres"]
		? await enrichWithTagSource(artistSignals, "MusicBrainz", getMusicBrainzGenres, 20)
		: {};
	const genres = mergeGenreMaps(spotifyGenres, lastFmGenres, musicBrainzGenres);
	const releaseYears = parseAlbums(albumsRaw);

	return { analysis, genres, releaseYears };
};

const getGenres = async (time_range: SpotifyRange, config: Config) => {
	const sourceCacheKey = getConfigCacheKey(config, { includeLastfmIdentity: true, includeMusicBrainz: true });
	const [topTracks, topArtists] = await Promise.all([
		cacher(() => getTopTracks(time_range, config))({ queryKey: ["top-tracks", time_range, sourceCacheKey] }),
		cacher(() => getTopArtists(time_range, config))({ queryKey: ["top-artists", time_range, sourceCacheKey] }),
	]);
	return parseTracks(topTracks, topArtists, config);
};

const GenresPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions(configWrapper), "stats:top-genres");
	const cacheKey = getConfigCacheKey(configWrapper.config, { includeLastfmIdentity: true, includeMusicBrainz: true });

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-genres", activeOption.id, cacheKey],
		queryFn: cacher(() => getGenres(activeOption.id as SpotifyRange, configWrapper.config)),
	});

	const Status = useStatus(status, error);

	const props = {
		lhs: ["Top Genres"],
		rhs: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-genres", activeOption.id, cacheKey], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const analysis = data as NonNullable<typeof data>;

	const statCards = Object.entries(analysis.analysis).map(([key, value]) => {
		return <StatCard label={key} value={parseStat(key)(value)} />;
	});

	// const obscureTracks = topGenres.obscureTracks.map((track: Track, index: number) => (
	// 	<TrackRow index={index + 1} {...track} uris={topGenres.obscureTracks.map((track) => track.uri)} />
	// ));

	return (
		<PageContainer {...props}>
			<section className="main-shelf-shelf Shelf">
				<ChartCard data={analysis.genres} />
				<div className={"main-gridContainer-gridContainer grid"}>{statCards}</div>
			</section>
			<Shelf title="Release Year Distribution">
				<ChartCard data={analysis.releaseYears} />
			</Shelf>
			{/* <Shelf title="Most Obscure Tracks">
				<Tracklist minified>{obscureTracks}</Tracklist>
			</Shelf> */}
		</PageContainer>
	);
};

export default React.memo(GenresPage);
