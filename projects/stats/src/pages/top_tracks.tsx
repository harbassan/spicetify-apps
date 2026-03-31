import React from "react";
import TrackRow from "../components/track_row";
import PageContainer from "@shared/components/page_container";
import Tracklist from "../components/tracklist";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import type { Config, ConfigWrapper } from "../types/stats_types";
import * as lastFM from "../api/lastfm";
import * as spotify from "../api/spotify";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";
import { DropdownOptions } from "./top_artists";
import type { SpotifyRange } from "../types/spotify";
import { convertTrack, getThrottledMapOptions, minifyTrack, throttledMap } from "../utils/converter";
import { useQuery } from "@shared/types/react_query";
import useStatus from "@shared/status/useStatus";
import { cacher, invalidator } from "../extensions/cache";
import { parseLiked } from "../utils/track_helper";
import { getConfigCacheKey } from "../utils/config_cache";
import CreatePlaylistButton from "../components/buttons/create_playlist_button";

const hasLastFmCredentials = (config: Config) => Boolean(config["api-key"] && config["lastfm-user"]);

const getLastFmTopTracks = async (timeRange: SpotifyRange, config: Config, lastfmOnly: boolean) => {
	const { "lastfm-user": user, "api-key": key } = config;
	if (!user || !key) throw new Error("Missing LastFM API Key or Username");
	const response = await lastFM.getTopTracks(key, user, timeRange);
	return throttledMap(response, (track) => convertTrack(track, lastfmOnly, key), getThrottledMapOptions(lastfmOnly));
};

export const getTopTracks = async (timeRange: SpotifyRange, config: Config) => {
	if (config["use-lastfm"] || config["lastfm-only"]) {
		return getLastFmTopTracks(timeRange, config, config["lastfm-only"]);
	}

	try {
		const response = await spotify.getTopTracks(timeRange);
		return response.map(minifyTrack);
	} catch (error) {
		if (!spotify.isSuppressedSpotifyError(error) || !hasLastFmCredentials(config)) throw error;
		return getLastFmTopTracks(timeRange, config, true);
	}
};

const TracksPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions(configWrapper), "stats:top-tracks");
	const cacheKey = getConfigCacheKey(configWrapper.config, { includeLastfmIdentity: true });

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-tracks", activeOption.id, cacheKey],
		queryFn: (props) =>
			cacher(() => getTopTracks(activeOption.id as SpotifyRange, configWrapper.config))(props).then(parseLiked),
	});

	const Status = useStatus(status, error);

	const props = {
		lhs: ["Top Tracks"],
		rhs: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-tracks", activeOption.id, cacheKey], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const topTracks = data as NonNullable<typeof data>;

	const spotifyUris = topTracks.map((track) => track.uri).filter((uri) => uri.startsWith("spotify:track:"));
	if (spotifyUris.length > 0) {
		props.rhs.push(
			<CreatePlaylistButton infoToCreatePlaylist={{
				playlistName: `Top Songs - ${activeOption.name}`,
				itemsUris: spotifyUris,
			}} />,
		);
	}

	const trackRows = topTracks.map((track, index) => (
		<TrackRow index={index + 1} {...track} uris={spotifyUris} />
	));

	return (
		<PageContainer {...props}>
			<Tracklist playcount={Boolean(topTracks[0]?.playcount)}>{trackRows}</Tracklist>
		</PageContainer>
	);
};

export default React.memo(TracksPage);
