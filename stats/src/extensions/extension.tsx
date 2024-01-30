import React from "react";
import PlaylistPage from "../pages/playlist";
import { STATS_VERSION } from "../constants";
import ConfigWrapper from "@shared/config/config_wrapper";

// contruct global class for stats methods
class SpicetifyStats {
    ConfigWrapper = new ConfigWrapper(
        [
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
            {
                name: "Artists Page",
                key: "show-artists",
                type: "toggle",
                def: true,
                sectionHeader: "Pages",
            },
            { name: "Tracks Page", key: "show-tracks", type: "toggle", def: true },
            {
                name: "Albums Page",
                key: "show-albums",
                type: "toggle",
                def: false,
                desc: `Requires Last.fm API key and username`,
            },
            { name: "Genres Page", key: "show-genres", type: "toggle", def: true },
            { name: "Library Page", key: "show-library", type: "toggle", def: true },
            {
                name: "Charts Page",
                key: "show-charts",
                type: "toggle",
                def: true,
                desc: `Requires Last.fm API key`,
            },
        ],
        "stats"
    );
}
window.SpicetifyStats = new SpicetifyStats();

(function stats() {
    const {
        PopupModal,
        LocalStorage,
        Topbar,
        Platform: { History },
    } = Spicetify;

    if (!PopupModal || !LocalStorage || !Topbar || !History) {
        setTimeout(stats, 300);
        return;
    }

    const version = localStorage.getItem("stats:version");
    if (!version || version !== STATS_VERSION) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i) as string;
            if (key.startsWith("stats:") && !key.startsWith("stats:config:")) {
                localStorage.removeItem(key);
            }
        }
        localStorage.setItem("stats:version", STATS_VERSION);
    }

    LocalStorage.set("stats:cache-info", JSON.stringify([0, 0, 0, 0, 0, 0]));

    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = "/spicetify-routes-stats.css";
    document.head.appendChild(styleLink);

    const playlistEdit = new Topbar.Button("playlist-stats", "visualizer", () => {
        const playlistUri = `spotify:playlist:${History.location.pathname.split("/")[2]}`;
        // @ts-ignore
        PopupModal.display({ title: "Playlist Stats", content: <PlaylistPage uri={playlistUri} />, isLarge: true });
    });
    playlistEdit.element.classList.toggle("hidden", true);

    function setTopbarButtonVisibility(pathname: string): void {
        const [, type, uid] = pathname.split("/");
        const isPlaylistPage = type === "playlist" && uid;
        playlistEdit.element.classList.toggle("hidden", !isPlaylistPage);
    }
    setTopbarButtonVisibility(History.location.pathname);

    History.listen(({ pathname }: { pathname: string }) => {
        setTopbarButtonVisibility(pathname);
    });
})();
