import React from "react";
import Status from "../components/status";
import useDropdownMenu from "../components/useDropdownMenu";
import { apiRequest, updatePageCache } from "../funcs";
import ArtistCard from "../components/artist_card";
import TrackRow from "../components/track_row";
import Tracklist from "../components/tracklist";
import PageHeader from "../components/page_header";

function filterLink(str: string): string {
    return str.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&()*+,;= ]/g, "").replace(/ /g, "+");
}

const ChartsPage = ({ config }: any) => {
    const [chartData, setChartData] = React.useState<Record<string, any>[] | 100 | 200 | 500>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(["artists", "tracks"], ["Top Artists", "Top Tracks"], "charts");

    async function fetchChartData(type: string, force?: boolean, set: boolean = true) {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:charts:${type}`);
            if (storedData) {
                setChartData(JSON.parse(storedData));
                return;
            }
        }

        const api_key = config.CONFIG["api-key"];
        if (!api_key) {
            setChartData(200);
            return;
        }

        const response = await apiRequest("charts", `http://ws.audioscrobbler.com/2.0/?method=chart.gettop${type}&api_key=${api_key}&format=json`);
        if (!response) {
            setChartData(500);
            return;
        }
        console.log(response);
        const data = response[type].track || response[type].artist;
        const cardData = await Promise.all(
            data.map(async (item: any) => {
                if (type === "artists") {
                    const spotifyItem = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/search?q=${filterLink(item.name)}&type=artist`).then(
                        (res: any) => res.artists.items[0]
                    );
                    return {
                        name: item.name,
                        image: spotifyItem.images[0].url,
                        uri: spotifyItem.uri,
                        id: spotifyItem.id,
                        subtext: item.playcount,
                    };
                } else {
                    const spotifyItem = await Spicetify.CosmosAsync.get(
                        `https://api.spotify.com/v1/search?q=track:${filterLink(item.name)}+artist:${filterLink(item.artist.name)}&type=track`
                    ).then((res: any) => res.tracks?.items[0]);
                    if (!spotifyItem) {
                        console.log(`https://api.spotify.com/v1/search?q=track:${filterLink(item.name)}+artist:${filterLink(item.artist.name)}&type=track`);
                        return {
                            name: item.name,
                            image: item.image[0]["#text"],
                            uri: item.url,
                            artists: [{ name: item.artist.name, uri: item.artist.url }],
                            duration: 0,
                            album: "N/A",
                            popularity: 0,
                            explicit: false,
                            album_uri: "N/A",
                        };
                    }
                    return {
                        name: item.name,
                        image: spotifyItem.album.images[0].url,
                        uri: spotifyItem.uri,
                        artists: spotifyItem.artists.map((artist: any) => ({ name: artist.name, uri: artist.uri })),
                        duration: spotifyItem.duration_ms,
                        album: spotifyItem.album.name,
                        popularity: spotifyItem.popularity,
                        explicit: spotifyItem.explicit,
                        album_uri: spotifyItem.album.uri,
                    };
                }
            })
        );

        if (set) setChartData(cardData);

        Spicetify.LocalStorage.set(`stats:charts:${type}`, JSON.stringify(cardData));
    }

    React.useEffect(() => {
        updatePageCache(4, fetchChartData, activeOption, "charts");
    }, []);

    React.useEffect(() => {
        fetchChartData(activeOption);
    }, [activeOption]);

    const props = {
        callback: () => fetchChartData(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    switch (chartData) {
        case 200:
            return (
                <PageHeader title={`Charts -  Top ${activeOption.charAt(0).toUpperCase()}${activeOption.slice(1)}`} {...props}>
                    <Status icon="error" heading="No API Key" subheading="Please enter your Last.fm API key in the settings menu." />
                </PageHeader>
            );
        case 500:
            return (
                <PageHeader title={`Charts -  Top ${activeOption.charAt(0).toUpperCase()}${activeOption.slice(1)}`} {...props}>
                    <Status icon="error" heading="Error" subheading="An error occurred while fetching the data." />
                </PageHeader>
            );
        case 100:
            return (
                <PageHeader title={`Charts -  Top ${activeOption.charAt(0).toUpperCase()}${activeOption.slice(1)}`} {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data from Last.fm..." />
                </PageHeader>
            );
    }

    if (activeOption === "artists") {
        const artistCards = chartData.map((artist, index) => (
            <ArtistCard key={artist.id} name={artist.name} image={artist.image} uri={artist.uri} subtext={`#${index + 1} Artist`} />
        ));
        return (
            <PageHeader title="Charts - Top Artists" {...props}>
                <div className={`main-gridContainer-gridContainer stats-grid`}>{artistCards}</div>
            </PageHeader>
        );
    } else {
        if (!chartData[0].album) setChartData(100);
        const trackRows = chartData.map((track: any, index) => <TrackRow index={index + 1} {...track} />);
        return (
            <PageHeader title="Charts - Top Tracks" {...props}>
                <Tracklist>{trackRows}</Tracklist>
            </PageHeader>
        );
    }
};

export default ChartsPage;
