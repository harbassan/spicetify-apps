import React from "react";
import useNavigationBar from "spcr-navigation-bar";
import ArtistsPage from "./pages/top_artists";
import TracksPage from "./pages/top_tracks";
import GenresPage from "./pages/top_genres";
import LibraryPage from "./pages/library";
import ChartsPage from "./pages/charts";
import AlbumsPage from "./pages/top_albums";
import { STATS_VERSION, LATEST_RELEASE } from "./constants";
import useConfig from "./components/hooks/useConfig";

import "./styles/app.scss";
import "./styles/settings_modal.scss";

const pages: Record<string, JSX.Element> = {
    ["Artists"]: <ArtistsPage />,
    ["Tracks"]: <TracksPage />,
    ["Albums"]: <AlbumsPage />,
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
    const config = useConfig([
        {
            name: "Last.fm Api Key",
            key: "api-key",
            type: "text",
            def: null,
            placeholder: "Enter API Key",
            desc: `You can get this by visiting www.last.fm/api/account/create and simply entering any name.<br/>You'll need to make an account first, which is a plus.`,
            sectionHeader: "Last.fm Integration",
        },
        {
            name: "Last.fm Username",
            key: "lastfm-user",
            type: "text",
            def: null,
            placeholder: "Enter Username",
        },
        {
            name: "Use Last.fm for Stats",
            key: "use-lastfm",
            type: "toggle",
            def: false,
            desc: `Last.fm charts your stats purely based on the streaming count, whereas Spotify factors in other variables`,
        },
        { name: "Artists Page", key: "show-artists", type: "toggle", def: true, sectionHeader: "Pages" },
        { name: "Tracks Page", key: "show-tracks", type: "toggle", def: true },
        { name: "Albums Page", key: "show-albums", type: "toggle", def: false, desc: `Requires Last.fm API key and username` },
        { name: "Genres Page", key: "show-genres", type: "toggle", def: true },
        { name: "Library Page", key: "show-library", type: "toggle", def: true },
        { name: "Charts Page", key: "show-charts", type: "toggle", def: true, desc: `Requires Last.fm API key` },
    ]);

    const tabPages = ["Artists", "Tracks", "Albums", "Genres", "Library", "Charts"].filter(page => config.CONFIG[`show-${page.toLowerCase()}`]);

    const [navBar, activeLink, setActiveLink] = useNavigationBar(tabPages);
    const [hasPageSwitched, setHasPageSwitched] = React.useState(false); // TODO: edit spcr-navigation-bar to include initial active link
    const [newUpdate, setNewUpdate] = React.useState(false);

    React.useEffect(() => {
        setActiveLink(Spicetify.LocalStorage.get("stats:active-link") || "Artists");
        checkForUpdates(setNewUpdate);
        setHasPageSwitched(true);
    }, []);

    React.useEffect(() => {
        Spicetify.LocalStorage.set("stats:active-link", activeLink);
    }, [activeLink]);

    if (!hasPageSwitched) {
        return <></>;
    }

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
