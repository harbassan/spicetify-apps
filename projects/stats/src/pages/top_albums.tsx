import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import SpotifyCard from "@shared/components/spotify_card";
import PageContainer from "@shared/components/page_container";
import type { Config, ConfigWrapper } from "../types/stats_types";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";
import type { SpotifyRange } from "../types/spotify";
import * as lastFM from "../api/lastfm";
import { convertAlbum, getThrottledMapOptions, throttledMap } from "../utils/converter";
import { useQuery } from "@shared/types/react_query";
import useStatus from "@shared/status/useStatus";
import { DropdownOptions } from "./top_artists";
import { cacher, invalidator } from "../extensions/cache";

export const getTopAlbums = async (timeRange: SpotifyRange, config: Config) => {
	const { "lastfm-user": user, "api-key": key, "lastfm-only": lastfmOnly } = config;
	if (!user || !key) throw new Error("Missing LastFM API Key or Username");
	const response = await lastFM.getTopAlbums(key, user, timeRange);
	return throttledMap(response, (album) => convertAlbum(album, lastfmOnly), getThrottledMapOptions(lastfmOnly));
};

const AlbumsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions(configWrapper), "stats:top-albums");

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-albums", activeOption.id],
		queryFn: cacher(() => getTopAlbums(activeOption.id as SpotifyRange, configWrapper.config)),
	});

	const Status = useStatus(status, error);

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
