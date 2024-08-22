import ConfigWrapper from "@shared/config/config_wrapper";
import React from "react";
import ReactDOM from "react-dom";
import ToggleFiltersButton from "../components/toggle_filters";
import CollapseButton from "../components/collapse_button";
import AlbumMenuItem from "../components/album_menu_item";
import ArtistMenuItem from "../components/artist_menu_item";
import "../extensions/collections_wrapper";
import "../extensions/folder_image_wrapper";

// inject css
const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = "/spicetify-routes-library.css";
document.head.appendChild(styleLink);

const setCardSize = (size: string) => {
	document.documentElement.style.setProperty("--library-card-size", `${size}px`);
};

const setSearchBarSize = (enlarged: boolean) => {
	const size = enlarged ? 300 : 200;
	document.documentElement.style.setProperty("--library-searchbar-size", `${size}px`);
};

const FolderImage = ({ url }: { url: string }) => {
	return (
		<img
			alt="Folder Image"
			aria-hidden="true"
			draggable="false"
			loading="eager"
			src={url}
			className="main-image-image x-entityImage-image main-image-loading main-image-loaded"
		/>
	);
};

const FolderPlaceholder = () => {
	return (
		<div className="x-entityImage-imagePlaceholder">
			<svg
				data-encore-id="icon"
				role="img"
				aria-hidden="true"
				className="Svg-sc-ytk21e-0 Svg-img-icon-medium"
				viewBox="0 0 24 24"
			>
				<path d="M1 4a2 2 0 0 1 2-2h5.155a3 3 0 0 1 2.598 1.5l.866 1.5H21a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4zm7.155 0H3v16h18V7H10.464L9.021 4.5a1 1 0 0 0-.866-.5z" />
			</svg>
		</div>
	);
};

// contruct global class for library methods
class SpicetifyLibrary {
	ConfigWrapper = new ConfigWrapper(
		[
			{
				name: "Card Size",
				key: "cardSize",
				type: "slider",
				min: 100,
				max: 200,
				step: 0.05,
				def: 180,
				callback: setCardSize,
			},
			{
				name: "Extend Search Bar",
				key: "extendSearchBar",
				type: "toggle",
				def: false,
				callback: setSearchBarSize,
			},
			{
				name: "Playlists Page",
				key: "show-playlists",
				type: "toggle",
				def: true,
				sectionHeader: "Pages",
			},
			{ name: "Albums Page", key: "show-albums", type: "toggle", def: true },
			{ name: "Collections Page", key: "show-collections", type: "toggle", def: true },
			{ name: "Artists Page", key: "show-artists", type: "toggle", def: true },
			{ name: "Shows Page", key: "show-shows", type: "toggle", def: true },
		],
		"library",
	);
}
window.SpicetifyLibrary = new SpicetifyLibrary();

(function wait() {
	const { LocalStorageAPI } = Spicetify.Platform;
	if (!LocalStorageAPI) {
		setTimeout(wait, 100);
		return;
	}
	main(LocalStorageAPI);
})();

// biome-ignore lint:
function main(LocalStorageAPI: any) {
	const isAlbum = (props: { uri: string }) => props.uri?.includes("album");
	const isArtist = (props: { uri: string }) => props.uri?.includes("artist");

	// @ts-expect-error
	Spicetify.ContextMenuV2.registerItem(<AlbumMenuItem />, isAlbum);
	// @ts-expect-error
	Spicetify.ContextMenuV2.registerItem(<ArtistMenuItem />, isArtist);

	Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", () => CollectionsWrapper.cleanCollections());

	function injectFolderImages() {
		const rootlist = document.querySelector(".main-rootlist-wrapper > div:nth-child(2)");
		if (!rootlist) return setTimeout(injectFolderImages, 100);

		setTimeout(() => {
			for (const el of Array.from(rootlist.children)) {
				const uri = el.querySelector("[aria-labelledby]")?.getAttribute("aria-labelledby")?.slice(14);
				if (uri?.includes("folder")) {
					const imageBox = el.querySelector(".x-entityImage-imageContainer");
					if (!imageBox) return; // for compact view

					const imageUrl = FolderImageWrapper.getFolderImage(uri);

					if (!imageUrl) ReactDOM.render(<FolderPlaceholder />, imageBox);
					else ReactDOM.render(<FolderImage url={imageUrl} />, imageBox);
				}
			}
		}, 500); // timeout is easier than waiting for certain elements
	}

	injectFolderImages();

	FolderImageWrapper.addEventListener("update", injectFolderImages);

	function injectYLXButtons() {
		// wait for the sidebar to load
		const ylx_filter = document.querySelector(".main-yourLibraryX-libraryRootlist > .main-yourLibraryX-libraryFilter");
		if (!ylx_filter) {
			return setTimeout(injectYLXButtons, 100);
		}

		injectFiltersButton(ylx_filter);
		injectCollapseButton(ylx_filter);
	}
	function injectFiltersButton(ylx_filter: Element) {
		// inject ylx button
		const toggleFiltersButton = document.createElement("span");
		toggleFiltersButton.classList.add("toggle-filters-button");
		ylx_filter.appendChild(toggleFiltersButton);
		ReactDOM.render(<ToggleFiltersButton />, toggleFiltersButton);
	}

	function injectCollapseButton(ylx_filter: Element) {
		const collapseButton = document.createElement("span");
		collapseButton.classList.add("collapse-button");
		ylx_filter.appendChild(collapseButton);
		ReactDOM.render(
			<Spicetify.ReactComponent.TooltipWrapper label="Collapse Sidebar" placement="top">
				<CollapseButton />
			</Spicetify.ReactComponent.TooltipWrapper>,
			collapseButton,
		);
	}

	// check if ylx is expanded on load
	const state = LocalStorageAPI.getItem("ylx-sidebar-state");
	if (state === 0) injectYLXButtons();

	// handle button injection on maximise/minimise
	LocalStorageAPI.getEvents()._emitter.addListener("update", (e: { data: Record<string, unknown> }) => {
		const { key, value } = e.data;
		if (key === "ylx-sidebar-state" && value === 0) {
			injectFolderImages();
			injectYLXButtons();
		}
		if (key === "ylx-sidebar-state" && value === 1) {
			injectFolderImages();
		}
	});
}
