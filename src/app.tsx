import React from "react";
import useNavigationBar from "spcr-navigation-bar";
import ArtistsPage from "./pages/top_artists";
import TracksPage from "./pages/top_tracks";
import GenresPage from "./pages/top_genres";
import LibraryPage from "./pages/library";
import ChartsPage from "./pages/charts";
import { STATS_VERSION, LATEST_RELEASE } from "./constants";
import useConfig from "./components/hooks/useConfig";

import "./styles/app.scss";
import "./styles/settings_modal.scss";

const pages: Record<string, JSX.Element> = {
    ["Artists"]: <ArtistsPage />,
    ["Tracks"]: <TracksPage />,
    ["Genres"]: <GenresPage />,
    ["Library"]: <LibraryPage />,
    ["Charts"]: <ChartsPage />,
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
    const [navBar, activeLink, setActiveLink] = useNavigationBar(["Artists", "Tracks", "Genres", "Library", "Charts"]);
    const [newUpdate, setNewUpdate] = React.useState(false);

    const config = useConfig([
        {
            name: "Last.fm Api Key",
            key: "api-key",
            type: "text",
            def: null,
            placeholder: "Enter API Key",
            desc: `You can get this by visiting www.last.fm/api/account/create and simply entering any name.<br/>You'll need to make an account first, which is a plus.`,
        },
    ]);

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
            {React.cloneElement(pages[activeLink], { config })}
        </>
    );
};

export default App;
