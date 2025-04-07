import React from "react";
import useNavigationBar from "spcr-navigation-bar";
import AlbumsPage from "./pages/albums";
import ArtistsPage from "./pages/artists";
import ShowsPage from "./pages/shows";
import PlaylistsPage from "./pages/playlists";
import type { ConfigWrapperProps } from "./types/library_types";
import { version } from "../package.json";

import "./styles/app.scss";
import "./styles/external.scss";
import "../../shared/config/config_modal.scss";
import "../../shared/shared.scss";
import CollectionsPage from "./pages/collections";
import { NavigationProvider, useNavigation } from "./components/nav_context";

const checkForUpdates = (setNewUpdate: (a: boolean) => void) => {
	fetch("https://api.github.com/repos/harbassan/spicetify-apps/releases")
		.then((res) => res.json())
		.then(
			(result) => {
				const releases = result.filter((release: any) => release.name.startsWith("library"));
				setNewUpdate(releases[0].name.slice(9) !== version);
			},
			(error) => {
				console.log("Failed to check for updates", error);
			},
		);
};

const NavbarContainer = ({ configWrapper }: { configWrapper: ConfigWrapperProps }) => {
	const pages: Record<string, React.ReactElement> = {
		["Artists"]: <ArtistsPage configWrapper={configWrapper} />,
		["Albums"]: <AlbumsPage configWrapper={configWrapper} />,
		["Shows"]: <ShowsPage configWrapper={configWrapper} />,
		["Playlists"]: <PlaylistsPage configWrapper={configWrapper} />,
		["Collections"]: <CollectionsPage configWrapper={configWrapper} />,
	};

	const tabPages = ["Playlists", "Albums", "Collections", "Artists", "Shows"].filter(
		(page) => configWrapper.config[`show-${page.toLowerCase()}`],
	);

	const [navBar, activeLink, setActiveLink] = useNavigationBar(tabPages);
	const [firstUpdate, setFirstUpdate] = React.useState(true);
	const [newUpdate, setNewUpdate] = React.useState(false);

	const { navigate, current } = useNavigation();

	React.useEffect(() => {
		setActiveLink(Spicetify.LocalStorage.get("library:active-link") || "Playlists");
		checkForUpdates(setNewUpdate);
		setFirstUpdate(false);
	}, []);

	React.useEffect(() => {
		Spicetify.LocalStorage.set("library:active-link", activeLink);
		navigate(activeLink);
	}, [activeLink]);

	if (firstUpdate) return <></>;

	return (
		<>
			{navBar}
			{newUpdate && (
				<div className="new-update">
					New app update available! Visit{" "}
					<a href="https://github.com/harbassan/spicetify-apps/releases">harbassan/spicetify-apps</a> to install.
				</div>
			)}
			{pages[current.split("/")[0]]}
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

	return (
		<div id="library-app">
			<NavigationProvider>
				<NavbarContainer configWrapper={configWrapper} />
			</NavigationProvider>
		</div>
	);
};

export default App;
