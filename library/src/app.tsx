import React from "react";
import useNavigationBar from "spcr-navigation-bar";
import AlbumsPage from "./pages/albums";
import ArtistsPage from "./pages/artists";
import ShowsPage from "./pages/shows";
import PlaylistsPage from "./pages/playlists";
import { ConfigWrapperProps } from "./types/library_types";

import "./styles/app.scss";
import "./styles/external.scss";
import "../../shared/config/config_modal.scss";
import "../../shared/shared.scss";

const tabPages = ["Playlists", "Albums", "Artists", "Shows"];

const NavbarContainer = ({ configWrapper }: { configWrapper: ConfigWrapperProps }) => {
    const pages: Record<string, React.ReactElement> = {
        ["Artists"]: <ArtistsPage configWrapper={configWrapper} />,
        ["Albums"]: <AlbumsPage configWrapper={configWrapper} />,
        ["Shows"]: <ShowsPage configWrapper={configWrapper} />,
        ["Playlists"]: <PlaylistsPage configWrapper={configWrapper} />,
    };

    const [navBar, activeLink, setActiveLink] = useNavigationBar(tabPages);
    const [firstUpdate, setFirstUpdate] = React.useState(true);

    React.useEffect(() => {
        setActiveLink(Spicetify.LocalStorage.get("library:active-link") || "Playlists");
        setFirstUpdate(false);
    }, []);

    React.useEffect(() => {
        Spicetify.LocalStorage.set("library:active-link", activeLink);
    }, [activeLink]);

    if (firstUpdate) return <></>;

    return (
        <>
            {navBar}
            {pages[activeLink]}
        </>
    );
};

const App = () => {
    const [config, setConfig] = React.useState({ ...SpicetifyLibrary.ConfigWrapper.Config });

    const launchModal = () => {
        SpicetifyLibrary.ConfigWrapper.launchModal(setConfig);
    };

    const configWrapper = {
        config: config,
        launchModal,
    };

    // handle folder navigation
    const { pathname } = Spicetify.Platform.History.location;
    const route = pathname.slice(8);

    // playlist folder route
    if (/^\/folder\/.+/.test(route)) {
        return (
            <div id="library-app">
                <PlaylistsPage folder={route.split("/").pop()} configWrapper={configWrapper} />
            </div>
        );
    }

    // default route
    return (
        <div id="library-app">
            <NavbarContainer configWrapper={configWrapper} />
        </div>
    );
};

export default App;
