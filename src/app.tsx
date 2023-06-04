import React from "react";
import useNavigationBar from "spcr-navigation-bar";
import ArtistsPage from "./pages/top_artists";
import TracksPage from "./pages/top_tracks";
import GenresPage from "./pages/top_genres";
import LibraryPage from "./pages/library";
import "./css/app.scss";
import { STATS_VERSION, LATEST_RELEASE } from "./constants";

const pages: Record<string, JSX.Element> = {
    ["Artists"]: <ArtistsPage />,
    ["Tracks"]: <TracksPage />,
    ["Genres"]: <GenresPage />,
    ["Library"]: <LibraryPage />,
};

const checkForUpdates = (setNewUpdate: (a: boolean) => void) => {
    fetch(LATEST_RELEASE)
        .then(res => res.json())
        .then(
            result => {
                try {
                    setNewUpdate(result[0].name.slice(1) !== STATS_VERSION);
                } catch (err) {
                    console.log(err);
                }
            },
            error => {
                console.log("Failed to check for updates", error);
            }
        );
};

const App = () => {
    const [navBar, activeLink, setActiveLink] = useNavigationBar(["Artists", "Tracks", "Genres", "Library"]);
    const [newUpdate, setNewUpdate] = React.useState(false);

    console.log("app render");
    console.log(newUpdate);

    React.useEffect(() => {
        setActiveLink(Spicetify.LocalStorage.get("stats:active-link") || "Artists");
        checkForUpdates(setNewUpdate);
    }, []);

    React.useEffect(() => {
        Spicetify.LocalStorage.set("stats:active-link", activeLink);
    }, [activeLink]);

    return (
        <>
            {newUpdate && (
                <div className="new-update">
                    New app update available! Visit <a href="https://github.com/harbassan/spicetify-stats/releases">harbassan/spicetify-stats</a> to install.
                </div>
            )}
            {navBar}
            {pages[activeLink]}
        </>
    );
};

export default App;
