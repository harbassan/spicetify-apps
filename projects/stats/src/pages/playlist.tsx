import React, { useCallback } from "react";
import StatCard from "../components/cards/stat_card";
import ChartCard from "../components/cards/chart_card";
import SpotifyCard from "@shared/components/spotify_card";
import Shelf from "../components/shelf";
import useStatus from "@shared/status/useStatus";
import { parseStat, parseTracks } from "../utils/track_helper";
import { getFullPlaylist } from "../api/platform";
import { usePopupQuery } from "../utils/usePopupQuery";

const getPlaylist = async (uri: string) => {
	const contents = await getFullPlaylist(uri);
	return parseTracks(contents);
};

const navigateFromModal = (uri: string) => {
	Spicetify.PopupModal.hide?.();
	const parts = uri.split(":");
	const path = parts.length >= 3 ? `/${parts[1]}/${parts.slice(2).join(":")}` : uri;
	Spicetify.Platform.History.push(path);
};

const PlaylistPage = ({ uri }: { uri: string }) => {
	const query = useCallback(() => getPlaylist(uri), [uri]);

	const { status, error, data } = usePopupQuery(query);

	const Status = useStatus(status, error);

	if (Status) return Status;

	const analysis = data as NonNullable<typeof data>;

	const statCards = Object.entries(analysis.analysis).map(([key, value]) => {
		return <StatCard key={key} label={key} value={parseStat(key)(value)} />;
	});

	const artistCards = analysis.artists.contents.slice(0, 10).map((artist) => {
		return (
			<SpotifyCard
				key={artist.uri}
				type="artist"
				provider={artist.type}
				uri={artist.uri}
				header={artist.name}
				subheader={`Appears in ${artist.frequency} tracks`}
				imageUrl={artist.image}
				onClickOverride={artist.type !== "lastfm" ? () => navigateFromModal(artist.uri) : undefined}
			/>
		);
	});

	const albumCards = analysis.albums.contents.slice(0, 10).map((album) => {
		return (
			<SpotifyCard
				key={album.uri}
				type="album"
				provider={album.type}
				uri={album.uri}
				header={album.name}
				subheader={`Appears in ${album.frequency} tracks`}
				imageUrl={album.image}
				onClickOverride={album.type !== "lastfm" ? () => navigateFromModal(album.uri) : undefined}
			/>
		);
	});

	return (
		<div id="stats-app" className="page-content encore-dark-theme encore-base-set">
			<section className="stats-libraryOverview">
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
			{artistCards.length > 0 && (
				<Shelf title="Most Frequent Artists">
					<div className={"main-gridContainer-gridContainer grid"}>{artistCards}</div>
				</Shelf>
			)}
			{albumCards.length > 0 && (
				<Shelf title="Most Frequent Albums">
					<div className={"main-gridContainer-gridContainer grid"}>{albumCards}</div>
				</Shelf>
			)}
			<Shelf title="Release Year Distribution">
				<ChartCard data={analysis.releaseYears} />
			</Shelf>
		</div>
	);
};

export default React.memo(PlaylistPage);
