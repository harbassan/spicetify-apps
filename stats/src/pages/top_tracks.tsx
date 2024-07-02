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
import { convertTrack, minifyTrack } from "../utils/converter";
import { useQuery } from "../utils/react_query";
import useStatus from "@shared/status/useStatus";
import { cacher, invalidator } from "../extensions/cache";

export const getTopTracks = async (timeRange: SpotifyRange, config: Config) => {
	if (config["use-lastfm"]) {
		const { "lastfm-user": user, "api-key": key } = config;
		if (!user || !key) throw new Error("Missing LastFM API Key or Username");
		const response = await lastFM.getTopTracks(key, user, timeRange);
		return Promise.all(response.map(convertTrack));
	}
	const response = await spotify.getTopTracks(timeRange);
	return response.map(minifyTrack);
};

const TracksPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions, "stats:top-tracks");

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-tracks", activeOption.id],
		queryFn: cacher(() => getTopTracks(activeOption.id as SpotifyRange, configWrapper.config)),
	});

	const Status = useStatus(status, error);

	const props = {
		title: "Top Tracks",
		headerEls: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-tracks", activeOption.id], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const topTracks = data as NonNullable<typeof data>;

	const infoToCreatePlaylist = {
		playlistName: `Top Songs - ${activeOption.name}`,
		itemsUris: topTracks.map((track) => track.uri),
	};

	const trackRows = topTracks.map((track, index) => (
		<TrackRow index={index + 1} {...track} uris={topTracks.map((track) => track.uri)} />
	));

	return (
		<PageContainer {...props} infoToCreatePlaylist={infoToCreatePlaylist}>
			<Tracklist playcount={Boolean(topTracks[0].playcount)}>{trackRows}</Tracklist>
		</PageContainer>
	);
};

export default React.memo(TracksPage);
