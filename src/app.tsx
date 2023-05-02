import React from "react";
import useNavigationBar from "spcr-navigation-bar";
import ArtistsPage from "./pages/top_artists";
import TracksPage from "./pages/top_tracks";
import GenresPage from "./pages/top_genres";
import LibraryPage from "./pages/library";
import "./css/app.scss";

const pages: Record<string, JSX.Element> = {
    ["Artists"]: <ArtistsPage />,
    ["Tracks"]: <TracksPage />,
    ["Genres"]: <GenresPage />,
    ["Library"]: <LibraryPage />,
};

const App = () => {
    const [navBar, activeLink, setActiveLink] = useNavigationBar(["Artists", "Tracks", "Genres", "Library"]);

    console.log("app render");

    React.useEffect(() => {
        setActiveLink("Artists");
    }, []);

    if (!activeLink) return <></>;

    return (
        <>
            {navBar}
            {pages[activeLink]}
        </>
    );
};

export default App;
