import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import StatCard from "../components/cards/stat_card";
import ChartCard from "../components/cards/chart_card";
import InlineGrid from "../components/inline_grid";
import PageContainer from "@shared/components/page_container";
import Shelf from "../components/shelf";
import { DropdownOptions } from "./top_artists";
import { getTopTracks } from "./top_tracks";
import type { Config, ConfigWrapper, LastFMMinifiedTrack, SpotifyMinifiedTrack } from "../types/stats_types";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";
import type { SpotifyRange } from "../types/spotify";
import { batchRequest, getMeanAudioFeatures, parseStat } from "../utils/track_helper";
import { useQuery } from "../utils/react_query";
import useStatus from "@shared/status/useStatus";
import { getArtistMetas } from "../api/spotify";
import { cacher, invalidator } from "../extensions/cache";

const parseArtists = async (artistsRaw: SpotifyMinifiedTrack["artists"]) => {
	const artists = await batchRequest(50, getArtistMetas)(artistsRaw.map((artist) => artist.uri.split(":")[2]));
	const genres = {} as Record<string, number>;
	for (const artist of artists) {
		for (const genre of artist.genres) {
			genres[genre] = (genres[genre] || 0) + 1;
		}
	}
	return genres;
};

const parseAlbums = (albums: SpotifyMinifiedTrack["album"][]) => {
	const releaseYears = {} as Record<string, number>;
	for (const album of albums) {
		const year = album.release_date.slice(0, 4);
		releaseYears[year] = (releaseYears[year] || 0) + 1;
	}
	return releaseYears;
};

const parseTracks = async (tracks: (SpotifyMinifiedTrack | LastFMMinifiedTrack)[]) => {
	const trackIDs: string[] = [];
	const albumsRaw: SpotifyMinifiedTrack["album"][] = [];
	const artistsRaw: SpotifyMinifiedTrack["artists"] = [];
	let explicit = 0;
	let popularity = 0;

	for (const track of tracks) {
		if (track.type !== "spotify") continue;
		popularity += track.popularity;
		explicit += track.explicit ? 1 : 0;
		trackIDs.push(track.id);
		albumsRaw.push(track.album);
		artistsRaw.push(...track.artists);
	}

	explicit = explicit / trackIDs.length;
	popularity = popularity / trackIDs.length;

	const audioFeatures = await getMeanAudioFeatures(trackIDs);
	const analysis = { ...audioFeatures, popularity, explicit };
	const genres = await parseArtists(artistsRaw);
	const releaseYears = parseAlbums(albumsRaw);

	return { analysis, genres, releaseYears };
};

const getGenres = async (time_range: SpotifyRange, config: Config) => {
	const topTracks = await cacher(() => getTopTracks(time_range, config))({ queryKey: ["top-tracks", time_range] });
	return parseTracks(topTracks);
};

const GenresPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, activeOption] = useDropdownMenu(DropdownOptions, "stats:top-genres");

	const { status, error, data, refetch } = useQuery({
		queryKey: ["top-genres", activeOption.id],
		queryFn: cacher(() => getGenres(activeOption.id as SpotifyRange, configWrapper.config)),
	});

	const Status = useStatus(status, error);

	const props = {
		title: "Top Genres",
		headerEls: [
			dropdown,
			<RefreshButton callback={() => invalidator(["top-genres", activeOption.id], refetch)} />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const analysis = data as NonNullable<typeof data>;

	const statCards = Object.entries(analysis.analysis).map(([key, value]) => {
		return <StatCard label={key} value={parseStat(key)(value)} />;
	});

	// const obscureTracks = topGenres.obscureTracks.map((track: Track, index: number) => (
	// 	<TrackRow index={index + 1} {...track} uris={topGenres.obscureTracks.map((track) => track.uri)} />
	// ));

	return (
		<PageContainer {...props}>
			<section className="main-shelf-shelf Shelf">
				<ChartCard data={analysis.genres} />
				<div className={"main-gridContainer-gridContainer grid"}>{statCards}</div>
			</section>
			<Shelf title="Release Year Distribution">
				<ChartCard data={analysis.releaseYears} />
			</Shelf>
			{/* <Shelf title="Most Obscure Tracks">
				<Tracklist minified>{obscureTracks}</Tracklist>
			</Shelf> */}
		</PageContainer>
	);
};

export default React.memo(GenresPage);
