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
import { useQuery } from "../hooks/use_query";
import useStatus from "../hooks/use_status";
import { DropdownOptions } from "./top_artists";
import { cacher, invalidator } from "../extensions/cache";

export const getTopAlbums = async (timeRange: SpotifyRange, config: Config) => {
	const { "lastfm-user": user, "api-key": key } = config;
	if (!user || !key) throw new Error("Missing LastFM API Key or Username");
	const response = await lastFM.getTopAlbums(key, user, timeRange);
	return Promise.all(response.map(convertAlbum));
};

const AlbumsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions(configWrapper), "stats:top-albums");

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-albums", activeOption.id],
		queryFn: cacher(() => getTopAlbums(activeOption.id as SpotifyRange, configWrapper.config)),
		retry: false,
	});

	const Status = useStatus(status, error, refetch);

	const props = {
		lhs: ["Top Albums"],
		rhs: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-albums", activeOption.id], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const topAlbums = data as NonNullable<typeof data>;

	const albumCards = topAlbums.map((album, index) => {
		return (
			<SpotifyCard
				key={`${album.uri}-${index}`}
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

export default AlbumsPage;
