import React from "react";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import Card from "../components/cards/artist_card";
import { apiRequest, updatePageCache, convertToSpotify } from "../funcs";
import Status from "../components/status";
import PageHeader from "../components/page_header";
import { ArtistCardProps, ConfigWrapper } from "../types/stats_types";

export const topArtistsReq = async (time_range: string, config: ConfigWrapper) => {
    if (config.CONFIG["use-lastfm"] === true) {
        if (!config.CONFIG["api-key"] || !config.CONFIG["lastfm-user"]) {
            return 300;
        }

        const lastfmperiods: Record<string, string> = {
            short_term: "1month",
            medium_term: "6month",
            long_term: "overall",
        };

        const response = await apiRequest(
            "lastfm",
            `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${config.CONFIG["lastfm-user"]}&api_key=${config.CONFIG["api-key"]}&format=json&period=${lastfmperiods[time_range]}`
        );

        if (!response) {
            return 200;
        }

        return await convertToSpotify(response.topartists.artist, "artists");
    } else {
        const response = await apiRequest("topArtists", `https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${time_range}`);

        if (!response) {
            return 200;
        }
        return response.items.map((artist: any) => {
            return {
                id: artist.id,
                name: artist.name,
                image: artist.images[2]
                    ? artist.images[2].url
                    : artist.images[1]
                    ? artist.images[1].url
                    : "https://images.squarespace-cdn.com/content/v1/55fc0004e4b069a519961e2d/1442590746571-RPGKIXWGOO671REUNMCB/image-asset.gif",
                uri: artist.uri,
                genres: artist.genres,
            };
        });
    }
};

const ArtistsPage = ({ config }: { config: ConfigWrapper }) => {
    const [topArtists, setTopArtists] = React.useState<ArtistCardProps[] | 100 | 200 | 300>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        `top-artists`
    );

    const fetchTopArtists = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:top-artists:${time_range}`);
            if (storedData) {
                setTopArtists(JSON.parse(storedData));
                return;
            }
        }

        const start = window.performance.now();
        const topArtists = await topArtistsReq(time_range, config);

        if (set) setTopArtists(topArtists);
        Spicetify.LocalStorage.set(`stats:top-artists:${time_range}`, JSON.stringify(topArtists));
        console.log("total artists fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(0, fetchTopArtists, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopArtists(activeOption);
    }, [activeOption]);

    const props = {
        title: "Top Artists",
        refreshCallback: () => fetchTopArtists(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    switch (topArtists) {
        case 300:
            return (
                <PageHeader {...props}>
                    <Status icon="error" heading="No API Key or Username" subheading="Please enter these in the settings menu" />
                </PageHeader>
            );
        case 200:
            return (
                <PageHeader {...props}>
                    <Status icon="error" heading="Failed to Fetch Top Artists" subheading="An error occurred while fetching the data" />
                </PageHeader>
            );
        case 100:
            return (
                <PageHeader {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageHeader>
            );
    }

    const artistCards = topArtists.map((artist, index) => (
        <Card key={artist.id} name={artist.name} image={artist.image} uri={artist.uri} subtext={`#${index + 1} Artist`} />
    ));

    return (
        <>
            <PageHeader {...props}>
                <div className={`main-gridContainer-gridContainer stats-grid`}>{artistCards}</div>
            </PageHeader>
        </>
    );
};

export default React.memo(ArtistsPage);
