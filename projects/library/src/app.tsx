import React from "react";

import AlbumsPage from "./pages/albums";
import ArtistsPage from "./pages/artists";
import ShowsPage from "./pages/shows";
import PlaylistsPage from "./pages/playlists";
import CollectionsPage from "./pages/collections";

import { version } from "../package.json";

import NavigationBar from "@shared/components/navigation/navigation_bar"

import "./styles/app.scss";
import "./styles/external.scss";
import "../../shared/src/config/config_modal.scss";
import "../../shared/src/shared.scss";

import { ConfigWrapper } from "./types/library_types";

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
		checkForUpdates(setNewUpdate);
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
	if (Spicetify.Platform && Spicetify.Platform.LibraryAPI && Spicetify.ReactQuery && SpicetifyLibrary) {
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
			setConfig({ ...SpicetifyLibrary.ConfigWrapper.Config });
			setReady(true);
		});
		return <></>;
	}


	const launchModal = () => {
		SpicetifyLibrary.ConfigWrapper.launchModal(setConfig);
	};

	const configWrapper = {
		config: config,
		launchModal,
	};

	return (
		<div id="library-app">
			<NavbarContainer configWrapper={configWrapper} />
		</div>
	);
};

export default App;
