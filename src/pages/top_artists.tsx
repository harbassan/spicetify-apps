import React from "react";
import DropdownMenu from "../components/dropdown";
import Card from "../components/artist_card";

const ArtistsPage = () => {
    const [topArtists, setTopArtists] = React.useState<any[]>([]);

    console.log(" artists page render");
    console.log(topArtists);

    const fetchTopArtists = async (time_range: string) => {
        const start = window.performance.now();
        Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${time_range}`).then(fetched_artists =>
            setTopArtists(fetched_artists.items)
        );
        const end = window.performance.now();
        console.log(end - start);
    };

    React.useEffect(() => {
        fetchTopArtists("short_term");
    }, []);

    const handleDropdownChange = React.useCallback((value: string) => {
        const timePeriods: Record<string, string> = {
            "Past 4 Weeks": "short_term",
            "Past 6 Months": "medium_term",
            "All Time": "long_term",
        };

        fetchTopArtists(timePeriods[value]);
    }, []);

    const artistCards = React.useMemo(
        () => topArtists.map((artist, index) => <Card key={artist.id} name={artist.name} image={artist.images[2].url} uri={artist.uri} subtext={"Artist"} />),
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
                        <DropdownMenu links={["Past 4 Weeks", "Past 6 Months", "All Time"]} switchCallback={handleDropdownChange} />
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
