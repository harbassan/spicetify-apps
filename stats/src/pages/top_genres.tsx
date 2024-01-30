import React from "react";

import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import StatCard from "../components/cards/stat_card";
import GenresCard from "../components/cards/genres_card";
import InlineGrid from "../components/inline_grid";
import Status from "@shared/components/status";
import PageContainer from "@shared/components/page_container";
import TrackRow from "../components/track_row";
import Tracklist from "../components/tracklist";
import Shelf from "../components/shelf";

import { topArtistsReq } from "./top_artists";
import { topTracksReq } from "./top_tracks";
import { apiRequest, fetchAudioFeatures, updatePageCache } from "../funcs";
import { ConfigWrapper, Track } from "../types/stats_types";
import { SPOTIFY } from "../endpoints";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";

interface GenresPageProps {
    genres: [string, number][];
    features: Record<string, number>;
    years: [string, number][];
    obscureTracks: Track[];
}

const DropdownOptions = [
    { id: "short_term", name: "Past Month" },
    { id: "medium_term", name: "Past 6 Months" },
    { id: "long_term", name: "All Time" },
];

const GenresPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
    const { LocalStorage } = Spicetify;

    const [topGenres, setTopGenres] = React.useState<GenresPageProps | 100 | 200 | 300>(100);
    const [dropdown, activeOption] = useDropdownMenu(DropdownOptions, "stats:top-genres");

    const fetchTopGenres = async (
        time_range: string,
        force?: boolean,
        set: boolean = true,
        force_refetch?: boolean
    ) => {
        if (!force) {
            let storedData = LocalStorage.get(`stats:top-genres:${time_range}`);
            if (storedData) return setTopGenres(JSON.parse(storedData));
        }
        const start = window.performance.now();

        const cacheInfo = JSON.parse(LocalStorage.get("stats:cache-info") as string);

        const fetchedItems = await Promise.all(
            ["artists", "tracks"].map(async (type: string, index: number) => {
                if (cacheInfo[index] === true && !force_refetch) {
                    return await JSON.parse(LocalStorage.get(`stats:top-${type}:${time_range}`) as string);
                }
                const fetchedItems = await (type === "artists"
                    ? topArtistsReq(time_range, configWrapper)
                    : topTracksReq(time_range, configWrapper));
                cacheInfo[index] = true;
                cacheInfo[2] = true;
                LocalStorage.set(`stats:top-${type}:${time_range}`, JSON.stringify(fetchedItems));
                LocalStorage.set("stats:cache-info", JSON.stringify(cacheInfo));
                return fetchedItems;
            })
        );

        for (let i = 0; i < 2; i++) {
            if (fetchedItems[i] === 200 || fetchedItems[i] === 300) return setTopGenres(fetchedItems[i]);
        }

        const fetchedArtists = fetchedItems[0].filter((artist: any) => artist?.genres);
        const fetchedTracks = fetchedItems[1].filter((track: any) => track?.id);

        const genres: [string, number][] = fetchedArtists.reduce((acc: [string, number][], artist: any) => {
            artist.genres.forEach((genre: string) => {
                const index = acc.findIndex(([g]) => g === genre);
                if (index !== -1) {
                    acc[index][1] += 1 * Math.abs(fetchedArtists.indexOf(artist) - 50);
                } else {
                    acc.push([genre, 1 * Math.abs(fetchedArtists.indexOf(artist) - 50)]);
                }
            });
            return acc;
        }, []);
        let trackPopularity = 0;
        let explicitness = 0;
        let releaseData: [string, number][] = [];
        const topTracks = fetchedTracks.map((track: Track) => {
            trackPopularity += track.popularity;

            if (track.explicit) explicitness++;
            if (track.release_year) {
                const year = track.release_year;
                const index = releaseData.findIndex(([y]) => y === year);
                if (index !== -1) {
                    releaseData[index][1] += 1;
                } else {
                    releaseData.push([year, 1]);
                }
            }
            return track.id;
        });

        async function testDupe(track: Track) {
            // perform a search to get rid of duplicate tracks
            const spotifyItem = await apiRequest(
                "track",
                SPOTIFY.search(track.name, track.artists[0].name),
                1,
                false
            ).then((res: any) => res.tracks?.items);
            if (!spotifyItem) return false;
            return spotifyItem.some((item: any) => {
                return item.name === track.name && item.popularity > track.popularity;
            });
        }

        let obscureTracks = [];
        for (let i = 0; i < fetchedTracks.length; i++) {
            let track = fetchedTracks[i];
            if (!track?.popularity) continue;
            if (obscureTracks.length < 5) {
                const dupe = await testDupe(track);
                if (dupe) continue;

                obscureTracks.push(track);
                obscureTracks.sort((a: Track, b: Track) => b.popularity - a.popularity);
                continue;
            }

            for (let j = 0; j < 5; j++) {
                if (track.popularity < obscureTracks[j].popularity) {
                    const dupe = await testDupe(track);
                    if (dupe) break;

                    obscureTracks.splice(j, 0, track);
                    obscureTracks = obscureTracks.slice(0, 5);
                    break;
                }
            }
        }

        const fetchedFeatures: any[] = await fetchAudioFeatures(topTracks);

        let audioFeatures: Record<string, number> = {
            danceability: 0,
            energy: 0,
            valence: 0,
            speechiness: 0,
            acousticness: 0,
            instrumentalness: 0,
            liveness: 0,
            tempo: 0,
        };

        for (let i = 0; i < fetchedFeatures.length; i++) {
            if (!fetchedFeatures[i]) continue;
            const track = fetchedFeatures[i];
            Object.keys(audioFeatures).forEach((feature) => {
                audioFeatures[feature] += track[feature];
            });
        }

        audioFeatures = {
            popularity: trackPopularity,
            explicitness,
            ...audioFeatures,
        };

        for (let key in audioFeatures) {
            audioFeatures[key] = audioFeatures[key] / 50;
        }
        console.log("total genres fetch time:", window.performance.now() - start);

        if (set)
            setTopGenres({
                genres: genres,
                features: audioFeatures,
                years: releaseData,
                obscureTracks: obscureTracks,
            });

        LocalStorage.set(
            `stats:top-genres:${time_range}`,
            JSON.stringify({
                genres: genres,
                features: audioFeatures,
                years: releaseData,
                obscureTracks: obscureTracks,
            })
        );
    };

    React.useEffect(() => {
        updatePageCache(2, fetchTopGenres, activeOption.id);
    }, []);

    React.useEffect(() => {
        fetchTopGenres(activeOption.id);
    }, [activeOption]);

    const refresh = () => {
        fetchTopGenres(activeOption.id, true);
    };

    const props = {
        title: "Top Genres",
        headerEls: [dropdown, <RefreshButton callback={refresh} />, <SettingsButton configWrapper={configWrapper} />],
    };

    switch (topGenres) {
        case 300:
            return (
                <PageContainer {...props}>
                    <Status
                        icon="error"
                        heading="No API Key or Username"
                        subheading="Please enter these in the settings menu"
                    />
                </PageContainer>
            );
        case 200:
            return (
                <PageContainer {...props}>
                    <Status
                        icon="error"
                        heading="Failed to Fetch Top Genres"
                        subheading="An error occurred while fetching the data"
                    />
                </PageContainer>
            );
        case 100:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageContainer>
            );
    }

    const statCards = Object.entries(topGenres.features).map(([key, value]) => {
        return <StatCard label={key} value={value} />;
    });

    const obscureTracks = topGenres.obscureTracks.map((track: Track, index: number) => (
        <TrackRow index={index + 1} {...track} uris={topGenres.obscureTracks.map((track) => track.uri)} />
    ));

    return (
        <PageContainer {...props}>
            <section className="main-shelf-shelf Shelf">
                <GenresCard genres={topGenres.genres} total={1275} />
                <InlineGrid special>{statCards}</InlineGrid>
            </section>
            <Shelf title="Release Year Distribution">
                <GenresCard genres={topGenres.years} total={50} />
            </Shelf>
            <Shelf title="Most Obscure Tracks">
                <Tracklist minified>{obscureTracks}</Tracklist>
            </Shelf>
        </PageContainer>
    );
};

export default React.memo(GenresPage);
