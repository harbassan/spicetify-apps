import ConfigWrapper from "@shared/config/config_wrapper";
import React from "react";
import ReactDOM from "react-dom";
import ToggleFiltersButton from "../components/toggle_filters";
import CollapseButton from "../components/collapse_button";
import ExpandButton from "../components/expand_button";
import CollectionWrapper from "./collections_wrapper";
import AlbumMenuItem from "../components/album_menu_item";

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
        ],
        "library"
    );
    CollectionWrapper = new CollectionWrapper();
}
window.SpicetifyLibrary = new SpicetifyLibrary();

(function wait() {
    const { LocalStorageAPI } = Spicetify?.Platform;
    if (!LocalStorageAPI) {
        setTimeout(wait, 100);
        return;
    }
    main(LocalStorageAPI);
})();

function main(LocalStorageAPI: any) {
    const isAlbum = (props: any) => {
        return props.uri?.includes("album");
    };

    // @ts-expect-error
    Spicetify.ContextMenuV2.registerItem(<AlbumMenuItem />, isAlbum);

    function injectYLXButtons() {
        // wait for the sidebar to load
        const ylx_filter = document.querySelector(
            ".main-yourLibraryX-libraryRootlist > .main-yourLibraryX-libraryFilter"
        );
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
            collapseButton
        );
    }

    function injectExpandButton() {
        const sidebarHeader = document.querySelector("li.main-yourLibraryX-navItem[data-id='/library']");
        if (!sidebarHeader) {
            return setTimeout(injectExpandButton, 100);
        }

        const expandButton = document.createElement("span");
        expandButton.classList.add("expand-button");
        sidebarHeader.appendChild(expandButton);
        ReactDOM.render(<ExpandButton />, expandButton);
    }

    function removeExpandButton() {
        const expandButton = document.querySelector(".expand-button");
        if (expandButton) expandButton.remove();
    }

    // check if ylx is expanded on load
    const state = LocalStorageAPI.getItem("ylx-sidebar-state");
    if (state === 0) {
        injectYLXButtons();
    } else if (state === 1) {
        injectExpandButton();
    }

    // handle button injection on maximise/minimise
    LocalStorageAPI.getEvents()._emitter.addListener("update", (e: any) => {
        const { key, value } = e.data;
        if (key === "ylx-sidebar-state" && value === 0) {
            injectYLXButtons();
            removeExpandButton();
        }
        if (key === "ylx-sidebar-state" && value === 1) {
            injectExpandButton();
        }
    });
}
