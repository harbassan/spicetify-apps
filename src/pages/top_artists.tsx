import React from "react";
import useDropdownMenu from "../components/useDropdownMenu";
import Card from "../components/artist_card";
import RefreshButton from "../components/refresh_button";
import { apiRequest, updatePageCache } from "../funcs";
import Status from "../components/status";

const ArtistsPage = ({ config }: any) => {
    const [topArtists, setTopArtists] = React.useState<any[] | false>([]);
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
        const topArtists = await apiRequest("topArtists", `https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${time_range}`);
        if (!topArtists) {
            setTopArtists(false);
            return;
        }
        const topArtistsMinified = topArtists.items.map((artist: any) => {
            return {
                id: artist.id,
                name: artist.name,
                image: artist.images[2]
                    ? artist.images[2].url
                    : artist.images[1]
                    ? artist.images[1].url
                    : "https://images.squarespace-cdn.com/content/v1/55fc0004e4b069a519961e2d/1442590746571-RPGKIXWGOO671REUNMCB/image-asset.gif",
                uri: artist.uri,
            };
        });
        if (set) setTopArtists(topArtistsMinified);
        Spicetify.LocalStorage.set(`stats:top-artists:${time_range}`, JSON.stringify(topArtistsMinified));
        console.log("total artists fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(0, fetchTopArtists, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopArtists(activeOption);
    }, [activeOption]);

    if (!topArtists) {
        return (
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="TypeElement-canon-type">
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
                <Status heading="Failed to Fetch Top Artists" subheading="Make an issue on Github" />
            </section>
        );
    }

    if (!topArtists.length) return <></>;

    const artistCards = topArtists.map((artist, index) => <Card key={artist.id} name={artist.name} image={artist.image} uri={artist.uri} subtext={"Artist"} />);

    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="TypeElement-canon-type">
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
