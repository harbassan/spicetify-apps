import React from "react";

import AlbumsPage from "./pages/albums";
import ArtistsPage from "./pages/artists";
import ShowsPage from "./pages/shows";
import PlaylistsPage from "./pages/playlists";
import CollectionsPage from "./pages/collections";
import DebugConsole from "./components/debug_console";
import { libraryDebug } from "./extensions/debug";

import { version } from "../package.json";

import NavigationBar from "@shared/components/navigation/navigation_bar"
import checkForUpdates from "@shared/updates/check_for_updates"

import "./styles/app.scss";
import "./styles/external.scss";
import "../../shared/src/config/config_modal.scss";
import "../../shared/src/shared.scss";

import { ConfigWrapper } from "./types/library_types";

const NavbarContainer = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const pages: Record<string, React.ReactElement> = {
		["Artists"]: <ArtistsPage configWrapper={configWrapper} />,
		["Albums"]: <AlbumsPage configWrapper={configWrapper} />,
		["Shows"]: <ShowsPage configWrapper={configWrapper} />,
		["Playlists"]: <PlaylistsPage configWrapper={configWrapper} />,
		["Collections"]: <CollectionsPage configWrapper={configWrapper} />,
	};

	const tabPages = ["Playlists", "Albums", "Collections", "Artists", "Shows"].filter(
		(page) => configWrapper.config[`show-${page.toLowerCase()}` as keyof ConfigWrapper["config"]],
	);

	const [newUpdate, setNewUpdate] = React.useState(false);

	const activePage = Spicetify.Platform.History.location.pathname.split("/")[2];

	React.useEffect(() => {
		checkForUpdates(setNewUpdate, "library", version);
	}, []);

	React.useEffect(() => {
		if (activePage === undefined) {
			const stored = Spicetify.LocalStorage.get("library:active-link") || "Playlists";
			Spicetify.Platform.History.replace(`library/${stored}`);
		}
	}, [activePage]);

	if (activePage === undefined) return <></>;

	return (
		<>
			<NavigationBar links={tabPages} selected={activePage} storekey="library:active-link" />
			{newUpdate && (
				<div className="new-update">
					New app update available! Visit{" "}
					<a href="https://github.com/harbassan/spicetify-apps/releases">harbassan/spicetify-apps</a> to install.
				</div>
			)}
			{pages[activePage]}
		</>
	);
};

const waitForReady = async (callback: () => void) => {
	if (Spicetify.Platform && Spicetify.Platform.LibraryAPI && window.SpicetifyLibrary) {
		callback();
	} else {
		setTimeout(() => waitForReady(callback), 1000);
	}
}

const App = () => {
	const [config, setConfig] = React.useState({} as ConfigWrapper["config"]);
	const [ready, setReady] = React.useState(false);

	// Sync debug logging with config — must be above the early return
	// so hooks are always called in the same order (React rules of hooks)
	React.useEffect(() => {
		libraryDebug.setEnabled(Boolean(config["show-debug-console"]));
	}, [config["show-debug-console"]]);

	// otherwise app crashes if its first page on spotify load
	if (!ready) {
		waitForReady(() => {
			setConfig({ ...window.SpicetifyLibrary.ConfigWrapper.Config });
			setReady(true);
		});
		return <></>;
	}

	const launchModal = () => {
		window.SpicetifyLibrary.ConfigWrapper.launchModal(setConfig);
	};

	const configWrapper = {
		config: config,
		launchModal,
	};

	return (
		<div id="library-app">
			<NavbarContainer configWrapper={configWrapper} />
			{config["show-debug-console"] && <DebugConsole />}
		</div>
	);
};

export default App;
