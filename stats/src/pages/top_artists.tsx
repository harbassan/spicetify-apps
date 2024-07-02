import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import SpotifyCard from "@shared/components/spotify_card";
import PageContainer from "@shared/components/page_container";
import type { Config, ConfigWrapper } from "../types/stats_types";
import SettingsButton from "@shared/components/settings_button";
import RefreshButton from "../components/buttons/refresh_button";
import * as lastFM from "../api/lastfm";
import * as spotify from "../api/spotify";
import { SpotifyRange } from "../types/spotify";
import { convertArtist, minifyArtist } from "../utils/converter";
import useStatus from "@shared/status/useStatus";
import { useQuery } from "../utils/react_query";
import { cacher, invalidator } from "../extensions/cache";

export const getTopArtists = async (timeRange: SpotifyRange, config: Config) => {
	if (config["use-lastfm"]) {
		const { "lastfm-user": user, "api-key": key } = config;
		if (!user || !key) throw new Error("Missing LastFM API Key or Username");
		const response = await lastFM.getTopArtists(key, user, timeRange);
		return Promise.all(response.map(convertArtist));
	}
	const response = await spotify.getTopArtists(timeRange);
	return response.map(minifyArtist);
};

export const DropdownOptions = [
	{ id: SpotifyRange.Short, name: "Past Month" },
	{ id: SpotifyRange.Medium, name: "Past 6 Months" },
	{ id: SpotifyRange.Long, name: "All Time" },
];

const ArtistsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions, "stats:top-artists");

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-artists", activeOption.id],
		queryFn: cacher(() => getTopArtists(activeOption.id as SpotifyRange, configWrapper.config)),
	});

	const Status = useStatus(status, error);

	const props = {
		title: "Top Artists",
		headerEls: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-artists", activeOption.id], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const topArtists = data as NonNullable<typeof data>;

	const artistCards = topArtists.map((artist, index) => (
		<SpotifyCard
			type={"artist"}
			provider={artist.type}
			uri={artist.uri}
			header={artist.name}
			subheader={artist.playcount ? `\u29BE ${artist.playcount} Scrobbles` : "Artist"}
			imageUrl={artist.image}
			badge={`${index + 1}`}
		/>
	));

	return (
		<>
			<PageContainer {...props}>
				{<div className={"main-gridContainer-gridContainer grid"}>{artistCards}</div>}
			</PageContainer>
		</>
	);
};

export default React.memo(ArtistsPage);
