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
import { convertArtist, getThrottledMapOptions, minifyArtist, throttledMap } from "../utils/converter";
import useStatus from "@shared/status/useStatus";
import { useQuery } from "@shared/types/react_query";
import { cacher, invalidator } from "../extensions/cache";
import { getConfigCacheKey } from "../utils/config_cache";

const hasLastFmCredentials = (config: Config) => Boolean(config["api-key"] && config["lastfm-user"]);

const getLastFmTopArtists = async (timeRange: SpotifyRange, config: Config, lastfmOnly: boolean) => {
	const { "lastfm-user": user, "api-key": key } = config;
	if (!user || !key) throw new Error("Missing LastFM API Key or Username");
	const response = await lastFM.getTopArtists(key, user, timeRange);
	return throttledMap(response, (artist) => convertArtist(artist, lastfmOnly, key), getThrottledMapOptions(lastfmOnly));
};

export const getTopArtists = async (timeRange: SpotifyRange, config: Config) => {
	if (config["use-lastfm"] || config["lastfm-only"]) {
		return getLastFmTopArtists(timeRange, config, config["lastfm-only"]);
	}

	try {
		const response = await spotify.getTopArtists(timeRange);
		return response.map(minifyArtist);
	} catch (error) {
		if (!spotify.isSuppressedSpotifyError(error) || !hasLastFmCredentials(config)) throw error;
		return getLastFmTopArtists(timeRange, config, true);
	}
};

export const DropdownOptions = ({ config: { "use-lastfm": useLastFM, "lastfm-only": lastfmOnly } }: ConfigWrapper) =>
	[
		(useLastFM || lastfmOnly) && { id: "extra_short_term", name: "Past Week" },
		{ id: SpotifyRange.Short, name: "Past 4 Weeks" },
		{ id: SpotifyRange.Medium, name: "Past 6 Months" },
		{ id: SpotifyRange.Long, name: "Long Term" },
	].filter(Boolean) as { id: string; name: string }[];

const ArtistsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions(configWrapper), "stats:top-artists");
	const cacheKey = getConfigCacheKey(configWrapper.config, { includeLastfmIdentity: true });

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-artists", activeOption.id, cacheKey],
		queryFn: cacher(() => getTopArtists(activeOption.id as SpotifyRange, configWrapper.config)),
	});

	const Status = useStatus(status, error);

	const props = {
		lhs: ["Top Artists"],
		rhs: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-artists", activeOption.id, cacheKey], refetch)} />,
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
