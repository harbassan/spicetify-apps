import React from "react";

import ArtistsPage from "./pages/top_artists";
import TracksPage from "./pages/top_tracks";
import GenresPage from "./pages/top_genres";
import LibraryPage from "./pages/library";
import ChartsPage from "./pages/charts";
import AlbumsPage from "./pages/top_albums";
import DebugConsole from "./components/debug_console";
import { statsDebug } from "./extensions/debug";

import { version } from "../package.json";

import NavigationBar from "@shared/components/navigation/navigation_bar"
import checkForUpdates from "@shared/updates/check_for_updates"

import "./styles/app.scss";
import "../../shared/src/config/config_modal.scss";
import "../../shared/src/shared.scss";

import { ConfigWrapper } from "./types/stats_types";


const NavbarContainer = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const pages: Record<string, React.ReactElement> = {
		["Artists"]: <ArtistsPage configWrapper={configWrapper} />,
		["Tracks"]: <TracksPage configWrapper={configWrapper} />,
		["Albums"]: <AlbumsPage configWrapper={configWrapper} />,
		["Genres"]: <GenresPage configWrapper={configWrapper} />,
		["Library"]: <LibraryPage configWrapper={configWrapper} />,
		["Charts"]: <ChartsPage configWrapper={configWrapper} />,
	};

	const tabPages = ["Artists", "Tracks", "Albums", "Genres", "Library", "Charts"].filter(
		(page) => configWrapper.config[`show-${page.toLowerCase()}` as keyof ConfigWrapper["config"]],
	);

	const [newUpdate, setNewUpdate] = React.useState(false);

	const activePage = Spicetify.Platform.History.location.pathname.split("/")[2];

	React.useEffect(() => {
		checkForUpdates(setNewUpdate, "stats", version);
	}, []);

	React.useEffect(() => {
		if (activePage === undefined) {
			const stored = Spicetify.LocalStorage.get("stats:active-link") || "Artists";
			Spicetify.Platform.History.replace(`stats/${stored}`);
		}
	}, [activePage]);

	if (activePage === undefined) return <></>;

	return (
		<>
			<NavigationBar links={tabPages} selected={activePage} storekey="stats:active-link" />
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
	if (Spicetify.Platform && Spicetify.Platform.RootlistAPI && SpicetifyStats) {
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
		statsDebug.setEnabled(Boolean(config["show-debug-console"]));
	}, [config["show-debug-console"]]);

	// otherwise app crashes if its first page on spotify load
	if (!ready) {
		waitForReady(() => {
			setConfig({ ...SpicetifyStats.ConfigWrapper.Config });
			setReady(true);
		});
		return <></>;
	}

	const launchModal = () => {
		SpicetifyStats.ConfigWrapper.launchModal(setConfig);
	};

	const configWrapper = {
		config: config,
		launchModal,
	};

	return (
		<div id="stats-app">
			<NavbarContainer configWrapper={configWrapper} />
			{config["show-debug-console"] && <DebugConsole />}
		</div>
	);

};

export default App;
