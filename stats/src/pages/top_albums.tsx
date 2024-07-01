import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import SpotifyCard from "@shared/components/spotify_card";
import PageContainer from "@shared/components/page_container";
import type { Config, ConfigWrapper } from "../types/stats_types";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";
import type { SpotifyRange } from "../types/spotify";
import * as lastFM from "../api/lastfm";
import { convertAlbum } from "../utils/converter";
import { useQuery } from "../utils/react_query";
import useStatus from "@shared/status/useStatus";
import { DropdownOptions } from "./top_artists";

export const getTopAlbums = async (timeRange: SpotifyRange, config: Config) => {
	const { "lastfm-user": user, "api-key": key } = config;
	if (!user || !key) throw new Error("Missing LastFM API Key or Username");
	const response = await lastFM.getTopAlbums(key, user, timeRange);
	return Promise.all(response.map(convertAlbum));
};

const AlbumsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions, "stats:top-albums");

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-albums", activeOption.id],
		queryFn: () => getTopAlbums(activeOption.id as SpotifyRange, configWrapper.config),
	});

	const Status = useStatus(status, error);

	const props = {
		title: "Top Albums",
		headerEls: [dropdown, <RefreshButton callback={refetch} />, <SettingsButton configWrapper={configWrapper} />],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const topAlbums = data as NonNullable<typeof data>;

	const albumCards = topAlbums.map((album, index) => {
		return (
			<SpotifyCard
				type={"album"}
				provider={album.type}
				uri={album.uri}
				header={album.name}
				subheader={album.playcount ? `\u29BE ${album.playcount} Scrobbles` : "Album"}
				imageUrl={album.image}
				badge={`${index + 1}`}
			/>
		);
	});

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{albumCards}</div>
		</PageContainer>
	);
};

export default React.memo(AlbumsPage);
