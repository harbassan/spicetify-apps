import React from "react";
import ArtistsPage from "./pages/top_artists";
import TracksPage from "./pages/top_tracks";
import GenresPage from "./pages/top_genres";
import LibraryPage from "./pages/library";
import ChartsPage from "./pages/charts";
import AlbumsPage from "./pages/top_albums";
import { version } from "../package.json";

import "./styles/app.scss";
import "../../shared/config/config_modal.scss";
import "../../shared/shared.scss";
import { ConfigWrapper } from "./types/stats_types";
import NavigationBar from "../../shared/components/navigation/navigation_bar.tsx"

const checkForUpdates = (setNewUpdate: (a: boolean) => void) => {
	fetch("https://api.github.com/repos/harbassan/spicetify-apps/releases")
		.then((res) => res.json())
		.then(
			(result) => {
				const releases = result.filter((release: any) => release.name.startsWith("stats"));
				setNewUpdate(releases[0].name.slice(7) !== version);
			},
			(error) => {
				console.log("Failed to check for updates", error);
			},
		);
};

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
		checkForUpdates(setNewUpdate);
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
	if (Spicetify.Platform && Spicetify.Platform.RootlistAPI && Spicetify.ReactQuery && SpicetifyStats) {
		callback();
	} else {
		setTimeout(() => waitForReady(callback), 1000);
	}
}

const App = () => {
	const [config, setConfig] = React.useState({} as ConfigWrapper["config"]);
	const [ready, setReady] = React.useState(false);

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
		</div>
	);

};

export default App;
