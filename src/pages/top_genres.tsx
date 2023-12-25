import React from "react";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import StatCard from "../components/cards/stat_card";
import GenresCard from "../components/cards/genres_card";
import { apiRequest, fetchAudioFeatures, updatePageCache } from "../funcs";
import InlineGrid from "../components/inline_grid";
import Status from "../components/status";
import PageHeader from "../components/page_header";
import { topArtistsReq } from "./top_artists";
import { topTracksReq } from "./top_tracks";
import TrackRow from "../components/track_row";
import Tracklist from "../components/tracklist";
import { ConfigWrapper, Track } from "../types/stats_types";

interface GenresPageProps {
    genres: [string, number][];
    features: Record<string, any>;
    years: [string, number][];
    obscureTracks: Track[];
}

const GenresPage = ({ config }: { config: ConfigWrapper }) => {
    const [topGenres, setTopGenres] = React.useState<GenresPageProps | 100 | 200 | 300>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        "top-genres"
    );

    const fetchTopGenres = async (time_range: string, force?: boolean, set: boolean = true, force_refetch?: boolean) => {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:top-genres:${time_range}`);
            if (storedData) {
                setTopGenres(JSON.parse(storedData));
                return;
            }
        }
        const start = window.performance.now();

        const cacheInfo = JSON.parse(Spicetify.LocalStorage.get("stats:cache-info") as string);

        const fetchedItems = await Promise.all(
            ["artists", "tracks"].map(async (type: string, index: number) => {
                if (cacheInfo[index] === true && !force_refetch) {
                    return await JSON.parse(Spicetify.LocalStorage.get(`stats:top-${type}:${time_range}`) as string);
                }
                const fetchedItems = await (type === "artists" ? topArtistsReq(time_range, config) : topTracksReq(time_range, config));
                cacheInfo[index] = true;
                cacheInfo[2] = true;
                Spicetify.LocalStorage.set(`stats:top-${type}:${time_range}`, JSON.stringify(fetchedItems));
                Spicetify.LocalStorage.set("stats:cache-info", JSON.stringify(cacheInfo));
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
            const spotifyItem = await Spicetify.CosmosAsync.get(
                `https://api.spotify.com/v1/search?q=track:${track.name}+artist:${track.artists[0].name}&type=track`
            ).then((res: any) => res.tracks?.items);
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
            Object.keys(audioFeatures).forEach(feature => {
                audioFeatures[feature] += track[feature];
            });
        }

        audioFeatures = { popularity: trackPopularity, explicitness, ...audioFeatures };

        for (let key in audioFeatures) {
            audioFeatures[key] = audioFeatures[key] / 50;
        }
        console.log("total genres fetch time:", window.performance.now() - start);

        if (set) setTopGenres({ genres: genres, features: audioFeatures, years: releaseData, obscureTracks: obscureTracks });

        Spicetify.LocalStorage.set(
            `stats:top-genres:${time_range}`,
            JSON.stringify({ genres: genres, features: audioFeatures, years: releaseData, obscureTracks: obscureTracks })
        );
    };

    React.useEffect(() => {
        updatePageCache(2, fetchTopGenres, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopGenres(activeOption);
    }, [activeOption]);

    const props = {
        callback: () => fetchTopGenres(activeOption, true, true, true),
        config: config,
        dropdown: dropdown,
    };

    switch (topGenres) {
        case 300:
            return (
                <PageHeader title={`Top Genres`} {...props}>
                    <Status icon="error" heading="No API Key or Username" subheading="Please enter these in the settings menu" />
                </PageHeader>
            );
        case 200:
            return (
                <PageHeader title="Top Genres" {...props}>
                    <Status icon="error" heading="Failed to Fetch Top Genres" subheading="An error occurred while fetching the data" />
                </PageHeader>
            );
        case 100:
            return (
                <PageHeader title={`Top Genres`} {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageHeader>
            );
    }

    const parseVal = (key: string) => {
        switch (key) {
            case "tempo":
                return Math.round(topGenres.features[key]) + "bpm";
            case "popularity":
                return Math.round(topGenres.features[key]) + "%";
            default:
                return Math.round(topGenres.features[key] * 100) + "%";
        }
    };

    const statCards = [];
    for (let key in topGenres.features) {
        statCards.push(<StatCard stat={key[0].toUpperCase() + key.slice(1)} value={parseVal(key)} />);
    }

    const obscureTracks = topGenres.obscureTracks.map((track: Track, index: number) => (
        <TrackRow index={index + 1} {...track} uris={topGenres.obscureTracks.map(track => track.uri)} />
    ));

    return (
        <>
            <PageHeader title="Top Genres" {...props}>
                <section className="main-shelf-shelf Shelf">
                    <GenresCard genres={topGenres.genres} total={1275} />
                    <InlineGrid special>{statCards}</InlineGrid>
                </section>
                <section className="main-shelf-shelf Shelf">
                    <div className="main-shelf-header">
                        <div className="main-shelf-topRow">
                            <div className="main-shelf-titleWrapper">
                                <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Release Year Distribution</h2>
                            </div>
                        </div>
                    </div>
                    <section>
                        <GenresCard genres={topGenres.years} total={50} />
                    </section>
                </section>
                <section className="main-shelf-shelf Shelf">
                    <div className="main-shelf-header">
                        <div className="main-shelf-topRow">
                            <div className="main-shelf-titleWrapper">
                                <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Most Obscure Tracks</h2>
                            </div>
                        </div>
                    </div>
                    <section>
                        <Tracklist minified={true}>{obscureTracks}</Tracklist>
                    </section>
                </section>
            </PageHeader>
        </>
    );
};

export default React.memo(GenresPage);
