import React from "react";
import PlaylistPage from "../pages/playlist";
import { STATS_VERSION } from "../constants";

(function stats() {
    const {PopupModal, LocalStorage, Topbar, Platform: { History }} = Spicetify;

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
