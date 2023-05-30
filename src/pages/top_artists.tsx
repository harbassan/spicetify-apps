import React from "react";
import useDropdownMenu from "../components/useDropdownMenu";
import Card from "../components/artist_card";
import RefreshButton from "../components/refresh_button";

const ArtistsPage = () => {
    const [topArtists, setTopArtists] = React.useState<any[]>([]);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        `top-artists`
    );

    const fetchTopArtists = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let cacheInfo = Spicetify.LocalStorage.get("stats:cache-info") || "000";
            if (cacheInfo[0] === "1") {
                let storedData = Spicetify.LocalStorage.get(`stats:top-artists:${time_range}`);
                if (storedData) {
                    setTopArtists(JSON.parse(storedData));
                    return;
                }
            } else {
                Spicetify.LocalStorage.set("stats:cache-info", "1" + cacheInfo.slice(1));
            }
        }

        const start = window.performance.now();
        const topArtists = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${time_range}`);
        const topArtistsMinified = topArtists.items.map((artist: any) => {
            return { id: artist.id, name: artist.name, image: artist.images[2].url, uri: artist.uri };
        });
        if (set) setTopArtists(topArtistsMinified);
        Spicetify.LocalStorage.set(`stats:top-artists:${time_range}`, JSON.stringify(topArtistsMinified));
        console.log(window.performance.now() - start);
    };

    React.useEffect(() => {
        let cacheInfo = Spicetify.LocalStorage.get("stats:cache-info");
        if (cacheInfo && cacheInfo[0] === "0") {
            ["short_term", "medium_term", "long_term"].filter(option => option !== activeOption).forEach(option => fetchTopArtists(option, true, false));
            fetchTopArtists(activeOption, true);
            Spicetify.LocalStorage.set("stats:cache-info", "1" + cacheInfo.slice(1));
        }
    }, []);

    React.useEffect(() => {
        fetchTopArtists(activeOption);
    }, [activeOption]);

    const artistCards = React.useMemo(
        () => topArtists.map((artist, index) => <Card key={artist.id} name={artist.name} image={artist.image} uri={artist.uri} subtext={"Artist"} />),
        [topArtists]
    );

    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-type">
                        Top Artists
                    </h1>
                    <div className="collection-searchBar-searchBar">
                        <RefreshButton
                            refreshCallback={() => {
                                fetchTopArtists(activeOption, true);
                            }}
                        />
                        {dropdown}
                    </div>
                </div>
                <div>
                    <div className={`main-gridContainer-gridContainer stats-grid`}>{artistCards}</div>
                </div>
            </section>
        </>
    );
};

export default React.memo(ArtistsPage);
