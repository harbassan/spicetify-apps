import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import SpotifyCard from "@shared/components/spotify_card";
import TrackRow from "../components/track_row";
import Tracklist from "../components/tracklist";
import PageContainer from "@shared/components/page_container";
import type {
	Config,
	ConfigWrapper,
	LastFMMinifiedArtist,
	LastFMMinifiedTrack,
	SpotifyMinifiedArtist,
	SpotifyMinifiedTrack,
} from "../types/stats_types";
import * as lastFM from "../api/lastfm";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";
import { convertArtist, convertTrack, getThrottledMapOptions, throttledMap } from "../utils/converter";
import useStatus from "@shared/status/useStatus";
import { useQuery } from "@shared/types/react_query";
import { cacher, invalidator } from "../extensions/cache";
import CreatePlaylistButton from "../components/buttons/create_playlist_button";
// @ts-ignore
import _ from "lodash";
import { parseLiked } from "../utils/track_helper";
import { getConfigCacheKey } from "../utils/config_cache";

export const formatNumber = (num: number) => {
	if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
	if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
	if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
	return num.toString();
};

const DropdownOptions = [
	{ id: "artists", name: "Top Artists" },
	{ id: "tracks", name: "Top Tracks" },
];

type ArtistChartData = {
	kind: "artists";
	items: (LastFMMinifiedArtist | SpotifyMinifiedArtist)[];
};

type TrackChartData = {
	kind: "tracks";
	items: (LastFMMinifiedTrack | SpotifyMinifiedTrack)[];
};

type ChartData = ArtistChartData | TrackChartData;

const sortByPlaycount = <T extends { playcount?: number }>(items: T[]) => {
	return [...items].sort((left, right) => (right.playcount ?? 0) - (left.playcount ?? 0));
};

const getArtistChart = async (config: Config) => {
	const { "api-key": key, "lastfm-only": lastfmOnly } = config;
	if (!key) throw new Error("Missing LastFM API Key");
	const response = await lastFM.getArtistChart(key);
	const items = await throttledMap(response, (artist) => convertArtist(artist, lastfmOnly, key), getThrottledMapOptions(lastfmOnly));
	return {
		kind: "artists" as const,
		items: sortByPlaycount(items),
	};
};

const getTrackChart = async (config: Config) => {
	const { "api-key": key, "lastfm-only": lastfmOnly } = config;
	if (!key) throw new Error("Missing LastFM API Key");
	const response = await lastFM.getTrackChart(key);
	const items = await throttledMap(response, (track) => convertTrack(track, lastfmOnly, key), getThrottledMapOptions(lastfmOnly));
	return {
		kind: "tracks" as const,
		items: sortByPlaycount(await parseLiked(items)),
	};
};

const ArtistChart = ({ artists }: { artists: (LastFMMinifiedArtist | SpotifyMinifiedArtist)[] }) => {
	return (
		<div className={"main-gridContainer-gridContainer grid"}>
			{artists.map((artist, index) => {
				return (
					<SpotifyCard
						type={"artist"}
						provider={artist.type}
						uri={artist.uri}
						header={artist.name}
						subheader={artist.playcount ? `\u29BE ${formatNumber(artist.playcount)} Scrobbles` : "Artist"}
						imageUrl={artist.image}
						badge={`${index + 1}`}
					/>
				);
			})}
		</div>
	);
};

const TrackChart = ({ tracks, spotifyUris }: { tracks: (LastFMMinifiedTrack | SpotifyMinifiedTrack)[]; spotifyUris: string[] }) => {
	return (
		<Tracklist playcount>
			{tracks.map((track, index) => (
				<TrackRow index={index + 1} {...track} uris={spotifyUris} />
			))}
		</Tracklist>
	);
};

const getDate = () => {
	return new Date().toLocaleDateString("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const ChartsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions, "stats:charts");
	const isArtistChart = activeOption.id === "artists";
	const cacheKey = getConfigCacheKey(configWrapper.config, { includeLastfmIdentity: true });

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-charts", activeOption.id, cacheKey],
		queryFn: (props) => (isArtistChart ? cacher(() => getArtistChart(configWrapper.config))(props) : cacher(() => getTrackChart(configWrapper.config))(props)),
	});

	const Status = useStatus(status, error);

	const props = {
		lhs: [`Top Charts - ${_.startCase(activeOption.id)}`],
		rhs: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-charts", activeOption.id, cacheKey], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const chartData = data as ChartData | undefined;
	if (!chartData || chartData.kind !== activeOption.id) {
		return <PageContainer {...props}><div>Loading chart data...</div></PageContainer>;
	}

	const items = chartData.items;
	if (!items.length) return <PageContainer {...props}><div>No chart data available.</div></PageContainer>;

	let spotifyUris: string[] = [];
	if (!isArtistChart) {
		spotifyUris = items.map((track) => track.uri).filter((uri) => uri.startsWith("spotify:track:"));
		if (spotifyUris.length > 0) {
			props.rhs.push(
				<CreatePlaylistButton infoToCreatePlaylist={{
					playlistName: `Top Track Chart - ${getDate()}`,
					itemsUris: spotifyUris,
				}} />,
			);
		}
	}

	const chartToRender = isArtistChart ? <ArtistChart artists={items} /> : <TrackChart tracks={items} spotifyUris={spotifyUris} />;

	return <PageContainer {...props}>{chartToRender}</PageContainer>;
};

export default React.memo(ChartsPage);
