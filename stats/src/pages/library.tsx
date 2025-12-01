import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import StatCard from "../components/cards/stat_card";
import ChartCard from "../components/cards/chart_card";
import SpotifyCard from "@shared/components/spotify_card";
import InlineGrid from "../components/inline_grid";
import PageContainer from "@shared/components/page_container";
import Shelf from "../components/shelf";
import type { ConfigWrapper } from "../types/stats_types";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";
import { useQuery } from "../../../shared/types/react_query";
import useStatus from "@shared/status/useStatus";
import { parseStat, parseTracks } from "../utils/track_helper";
import { cacher, invalidator } from "../extensions/cache";
import { getFullPlaylist, getRootlist } from "../api/platform";

const DropdownOptions = [
	{ id: "owned", name: "My Playlists" },
	{ id: "all", name: "All Playlists" },
];

const getLibrary = async (type: "owned" | "all") => {
	let playlists = await getRootlist();
	if (type === "owned") playlists = playlists.filter((p) => p.isOwnedBySelf);
	if (playlists.length === 0) throw new Error("You have no playlists saved");
	const contents = await Promise.all(playlists.map((p) => getFullPlaylist(p.uri)));
	const analysis = await parseTracks(contents.flat());
	return { ...analysis, playlists: playlists.length };
};

const LibraryPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions, "stats:library");

	const { status, error, data, refetch } = useQuery({
		queryKey: ["library", activeOption.id],
		queryFn: cacher(() => getLibrary(activeOption.id as "owned" | "all")),
	});

	const props = {
		lhs: ["Library Analysis"],
		rhs: [
			dropdown,
			<RefreshButton callback={() => invalidator(["library", activeOption.id], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	const Status = useStatus(status, error);

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const analysis = data as NonNullable<typeof data>;

	const statCards = Object.entries(analysis.analysis).map(([key, value]) => {
		return <StatCard label={key} value={parseStat(key)(value)} />;
	});

	const artistCards = analysis.artists.contents.slice(0, 10).map((artist) => {
		return (
			<SpotifyCard
				type="artist"
				provider={artist.type}
				uri={artist.uri}
				header={artist.name}
				subheader={`Appears in ${artist.frequency} tracks`}
				imageUrl={artist.image}
			/>
		);
	});

	const albumCards = analysis.albums.contents.slice(0, 10).map((album) => {
		return (
			<SpotifyCard
				type="album"
				provider={album.type}
				uri={album.uri}
				header={album.name}
				subheader={`Appears in ${album.frequency} tracks`}
				imageUrl={album.image}
			/>
		);
	});

	return (
		<PageContainer {...props}>
			<section className="stats-libraryOverview">
				<StatCard label="Total Playlists" value={analysis.playlists} />
				<StatCard label="Total Tracks" value={analysis.length} />
				<StatCard label="Total Artists" value={analysis.artists.length} />
				<StatCard label="Total Albums" value={analysis.albums.length} />
				<StatCard label="Total Minutes" value={Math.floor(analysis.duration / 60000)} />
				<StatCard label="Total Hours" value={(analysis.duration / 3600000).toFixed(1)} />
			</section>
			<Shelf title="Most Frequent Genres">
				<ChartCard data={analysis.genres} />
				<div className={"main-gridContainer-gridContainer grid"}>{statCards}</div>
			</Shelf>
			<Shelf title="Most Frequent Artists">
				<InlineGrid>{artistCards}</InlineGrid>
			</Shelf>
			<Shelf title="Most Frequent Albums">
				<InlineGrid>{albumCards}</InlineGrid>
			</Shelf>
			<Shelf title="Release Year Distribution">
				<ChartCard data={analysis.releaseYears} />
			</Shelf>
		</PageContainer>
	);
};

export default React.memo(LibraryPage);
