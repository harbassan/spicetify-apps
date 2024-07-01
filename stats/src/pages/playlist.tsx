import React from "react";
import StatCard from "../components/cards/stat_card";
import GenresCard from "../components/cards/genres_card";
import SpotifyCard from "@shared/components/spotify_card";
import InlineGrid from "../components/inline_grid";
import Shelf from "../components/shelf";
import { useQuery } from "../utils/react_query";
import useStatus from "@shared/status/useStatus";
import { getPlaylistMeta } from "../api/spotify";
import { parseTracks } from "../utils/track_helper";

const getPlaylist = async (uri: string) => {
	const playlistMeta = await getPlaylistMeta(uri.split(":")[2]);
	const contents = playlistMeta.tracks.items;
	return parseTracks(contents);
};

const PlaylistPage = ({ uri }: { uri: string }) => {
	const { status, error, data, refetch } = useQuery({
		queryKey: ["playlist", uri],
		queryFn: () => getPlaylist(uri),
	});

	const Status = useStatus(status, error);

	if (Status) return Status;

	const analysis = data as NonNullable<typeof data>;

	const statCards = Object.entries(analysis.analysis).map(([key, value]) => {
		return <StatCard label={key} value={value} />;
	});

	const artistCards = analysis.artists.map((artist) => {
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

	const albumCards = analysis.albums.map((album) => {
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
		<div id="stats-app" className="page-content encore-dark-theme encore-base-set">
			<section className="stats-libraryOverview">
				<StatCard label="Total Tracks" value={analysis.length} />
				<StatCard label="Total Artists" value={analysis.artists.length} />
				<StatCard label="Total Minutes" value={Math.floor(analysis.duration / 60)} />
				<StatCard label="Total Hours" value={(analysis.duration / 3600).toFixed(1)} />
			</section>
			<Shelf title="Most Frequent Genres">
				<GenresCard genres={analysis.genres} />
				<InlineGrid special>{statCards}</InlineGrid>
			</Shelf>
			<Shelf title="Most Frequent Artists">
				<InlineGrid>{artistCards}</InlineGrid>
			</Shelf>
			<Shelf title="Most Frequent Albums">
				<InlineGrid>{albumCards}</InlineGrid>
			</Shelf>
			<Shelf title="Release Year Distribution">
				<GenresCard genres={analysis.releaseYears} />
			</Shelf>
		</div>
	);
};

export default React.memo(PlaylistPage);
