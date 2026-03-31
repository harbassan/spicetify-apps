import React from "react";
import PlaylistPage from "../pages/playlist";
import ArtistPage, { getCachedArtistName, populateOverviewCache } from "../pages/artist";
import { version as STATS_VERSION } from "../../package.json";
import ConfigWrapper from "@shared/config/config_wrapper";
import { startAuthFlow, handleCallback, clearTokens, getConnectionStatus } from "../api/oauth";
import { getArtistOverview } from "../api/platform";

const getOAuthStatusLabel = () => {
	const { connected, expiresAt } = getConnectionStatus();
	const hasRefreshToken = Boolean(localStorage.getItem("stats:oauth:refresh_token"));

	if (!connected && !hasRefreshToken) return "Disconnected";
	if (!connected && hasRefreshToken) return "Offline \u2014 auto-reconnect available";
	if (!expiresAt) return hasRefreshToken ? "Connected" : "Connected (no refresh token)";

	const expiresText = expiresAt.toLocaleString();
	return hasRefreshToken
		? `Connected \u00B7 expires ${expiresText}`
		: `Connected \u00B7 expires ${expiresText} (no refresh token)`;
};

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
				desc: "Last.fm charts your stats purely based on the streaming count, whereas Spotify factors in other variables",
			},
			{
				name: "LastFM Only (No Spotify API)",
				key: "lastfm-only",
				type: "toggle",
				def: true,
				desc: "Avoid Spotify Web API calls for Stats pages and use Last.fm-only conversions. Does not affect Artist Stats, which uses Spicetify's internal GraphQL (not the rate-limited public API).",
			},
			{
				name: "Include MusicBrainz Genre Tags",
				key: "use-musicbrainz-genres",
				type: "toggle",
				def: false,
				desc: "Augment genre analysis with MusicBrainz tags derived from the current timeframe's top tracks and top artists.",
			},
			{
				name: "Spotify Client ID",
				key: "oauth-client-id",
				type: "text",
				def: null,
				placeholder: "Enter Client ID from Spotify Developer Dashboard",
				desc: `Create an app at developer.spotify.com/dashboard. Add redirect URI: http://127.0.0.1:5173/callback`,
				sectionHeader: "OAuth (Bypass Rate Limits)",
			},
			{
				name: "Use OAuth",
				key: "use-oauth",
				type: "toggle",
				def: false,
				desc: "Use your own Spotify Developer App instead of the built-in API",
				callback: (enabled: boolean) => {
					if (enabled) {
						startAuthFlow();
					}
				},
				initializeCallback: false,
			},
			{
				name: "Paste Callback URL",
				key: "oauth-callback",
				type: "text",
				def: null,
				placeholder: "http://127.0.0.1:5173/callback?code=...",
				desc: "After authorizing, copy the full URL from your browser and paste it here",
				initializeCallback: false,
				callback: async (url: string) => {
					if (url && url.includes("code=")) {
						await handleCallback(url);
					}
				},
			},
			{
				name: "OAuth Status",
				key: "oauth-status",
				type: "display",
				def: null,
				desc: "Shows whether Stats currently has a usable access token and whether a refresh token is stored for automatic recovery.",
				displayValue: getOAuthStatusLabel,
			},
			{
				name: "Disconnect OAuth",
				key: "oauth-disconnect",
				type: "toggle",
				def: false,
				desc: "Toggle to disconnect your Spotify Developer App",
				callback: (value: boolean) => {
					if (value) {
						clearTokens();
						localStorage.setItem("stats:config:use-oauth", "false");
						localStorage.removeItem("stats:config:oauth-callback");
						Spicetify.showNotification("OAuth disconnected", false);
						// Reset the toggle
						localStorage.setItem("stats:config:oauth-disconnect", "false");
					}
				},
				initializeCallback: false,
			},
			{
				name: "Use Direct Fetch (Experimental)",
				key: "use-direct-fetch",
				type: "toggle",
				def: false,
				desc: "Bypass CosmosAsync and use direct API calls. May help with rate limiting issues.",
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
				desc: "Requires Last.fm API key and username",
			},
			{ name: "Genres Page", key: "show-genres", type: "toggle", def: true },
			{ name: "Library Page", key: "show-library", type: "toggle", def: true },
			{
				name: "Charts Page",
				key: "show-charts",
				type: "toggle",
				def: true,
				desc: "Requires Last.fm API key",
			},
			{
				name: "Show Artist Stats Button",
				key: "show-artist-stats-button",
				type: "toggle",
				def: true,
				desc: "Show a button on artist pages to open the Artist Stats popup.",
				sectionHeader: "Artist Stats",
				initializeCallback: false,
				callback: (value: boolean) => {
					if (value === false) {
						window.dispatchEvent(new CustomEvent("stats:artist-button-toggle", { detail: false }));
					} else {
						window.dispatchEvent(new CustomEvent("stats:artist-button-toggle", { detail: true }));
					}
				},
			},
			{
				name: "Button Position",
				key: "artist-stats-button-order",
				type: "slider",
				min: -3,
				max: 5,
				step: 1,
				def: 0,
				desc: "Controls where the Artist Stats button appears in the artist page action bar. Lower values move it left, higher values move it right.",
				initializeCallback: false,
				callback: (value: number) => {
					const btn = document.getElementById("stats-artist-inject-btn");
					if (btn) btn.style.order = String(value);
				},
			},
			{
				name: "Auto-Load Playlist Appearances",
				key: "auto-load-playlist-appearances",
				type: "toggle",
				def: true,
				desc: "Automatically scan your playlists for this artist when viewing Artist Stats. Disable to show a manual load button instead.",
			},
			{
				name: "Auto-Load Last.fm Top Tracks",
				key: "auto-load-lastfm-top-tracks",
				type: "toggle",
				def: false,
				desc: "Automatically fetch global top tracks from Last.fm when viewing Artist Stats. Requires a Last.fm API key.",
			},
			{
				name: "Auto-Load My Top Scrobbled Tracks",
				key: "auto-load-user-top-tracks",
				type: "toggle",
				def: false,
				desc: "Automatically fetch your personal top scrobbled tracks for the artist when viewing Artist Stats. Requires a Last.fm API key and username.",
			},
			{
				name: "Show Debug Console",
				key: "show-debug-console",
				type: "toggle",
				def: false,
				desc: "Show recent request logs, delayed enrichment work, and cache diagnostics inside Stats.",
				sectionHeader: "Diagnostics",
			},
		],
		"stats",
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
		const keysToRemove: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith("stats:") && !key.startsWith("stats:config:") && !key.startsWith("stats:oauth:")) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach((key) => localStorage.removeItem(key));
		localStorage.setItem("stats:version", STATS_VERSION);
	}

	const styleLink = document.createElement("link");
	styleLink.rel = "stylesheet";
	styleLink.href = "/spicetify-routes-stats.css";
	document.head.appendChild(styleLink);

	const playlistEdit = new Topbar.Button("playlist-stats", "visualizer", () => {
		const playlistUri = `spotify:playlist:${History.location.pathname.split("/")[2]}`;
		// @ts-ignore
		PopupModal.display({ title: "Playlist Stats", content: <PlaylistPage uri={playlistUri} />, isLarge: true });
	}, false);
	playlistEdit.element.classList.add("playlist-stats-button");
	playlistEdit.element.style.display = "none";

	// ── Artist Stats ─────────────────────────────────────────────
	// Topbar button is kept as a fallback only (hidden by default).
	// Primary injection targets the artist page action bar via MutationObserver.
	const artistStats = new Topbar.Button("artist-stats", "chart-down", () => {
		const parts = History.location.pathname.split("/");
		if (parts[1] === "artist" && parts[2]) {
			openArtistStats(parts[2]);
		}
	}, false);
	artistStats.element.classList.add("artist-stats-button");
	artistStats.element.style.display = "none";

	async function openArtistStats(artistId: string): Promise<void> {
		const artistUri = `spotify:artist:${artistId}`;
		let artistName = getCachedArtistName(artistId);
		if (!artistName) {
			try {
				const overview = await getArtistOverview(artistUri);
				populateOverviewCache(artistId, overview);
				artistName = overview.profile.name;
			} catch {
				artistName = null;
			}
		}
		const title = artistName ? `${artistName} Stats` : "Artist Stats";
		// @ts-ignore
		PopupModal.display({ title, content: <ArtistPage uri={artistUri} />, isLarge: true });
	}

	function removeInjectedArtistButton(): void {
		document.getElementById("stats-artist-inject-btn")?.remove();
	}

	let currentTargetArtistId: string | null = null;
	let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

	// Core injection function — called by MutationObserver and navigation handler.
	// Guards prevent redundant calls. No retry loop — the observer retries for us.
	function insertArtistButton(force = false): void {
		if (!currentTargetArtistId) return;
		if (document.getElementById("stats-artist-inject-btn")) return;

		const config = window.SpicetifyStats?.ConfigWrapper?.Config;
		if (!force && config?.["show-artist-stats-button"] === false) return;

		// Find action bar — prioritise the selector sort-play uses successfully
		const actionBar =
			document.querySelector(".main-actionBar-ActionBarRow") ??
			document.querySelector('[data-testid="action-bar-row"]') ??
			document.querySelector('[data-testid="action-bar"]') ??
			document.querySelector(".main-actionBar-ActionBar") ??
			document.querySelector('button[data-testid="follow-button"]')?.parentElement ??
			document.querySelector('button[data-testid="following-button"]')?.parentElement ??
			document.querySelector('button[data-testid="more-button"]')?.parentElement ??
			null;

		if (!actionBar) return; // Not rendered yet — observer will retry

		const btn = document.createElement("button");
		btn.id = "stats-artist-inject-btn";
		btn.className = "stats-artist-inject-btn";
		btn.type = "button";
		btn.setAttribute("aria-label", "Artist Stats");
		btn.title = "Artist Stats";

		const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svgEl.setAttribute("viewBox", "0 0 16 16");
		svgEl.setAttribute("aria-hidden", "true");
		const svgMarkup = (Spicetify as any).SVGIcons?.["chart-down"] ?? "";
		if (svgMarkup) {
			const parsed = new DOMParser().parseFromString(
				`<svg xmlns="http://www.w3.org/2000/svg">${svgMarkup}</svg>`,
				"image/svg+xml",
			);
			const errorNode = parsed.querySelector("parsererror");
			if (!errorNode) {
				for (const child of Array.from(parsed.documentElement.childNodes)) {
					svgEl.appendChild(document.importNode(child, true));
				}
			}
		}

		const textEl = document.createElement("span");
		textEl.textContent = "Artist Stats";

		btn.appendChild(svgEl);
		btn.appendChild(textEl);

		const orderValue = config?.["artist-stats-button-order"] ?? 0;
		btn.style.order = String(orderValue);

		const artistId = currentTargetArtistId;
		btn.addEventListener("click", () => openArtistStats(artistId));

		actionBar.appendChild(btn);
		// Injection succeeded — ensure topbar fallback stays hidden
		artistStats.element.style.display = "none";
	}

	function handleNavigation(pathname: string): void {
		const [, type, uid] = pathname.split("/");
		const isPlaylistPage = type === "playlist" && Boolean(uid);
		const isArtistPage = type === "artist" && Boolean(uid);

		currentTargetArtistId = isArtistPage ? uid : null;

		// Clear any pending fallback timer from a previous navigation
		if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }

		playlistEdit.element.style.display = isPlaylistPage ? "" : "none";
		artistStats.element.style.display = "none";
		removeInjectedArtistButton();

		if (isArtistPage) {
			const config = window.SpicetifyStats?.ConfigWrapper?.Config;
			const buttonEnabled = config?.["show-artist-stats-button"] !== false;

			if (buttonEnabled) {
				// Connect observer for artist pages
				actionBarObserver.observe(document.body, { childList: true, subtree: true });
				insertArtistButton();
				// Fallback: if injection hasn't succeeded after 5 s, show topbar button
				const fallbackId = uid;
				fallbackTimer = setTimeout(() => {
					fallbackTimer = null;
					if (currentTargetArtistId === fallbackId && !document.getElementById("stats-artist-inject-btn")) {
						artistStats.element.style.display = "";
					}
				}, 5000);
			} else {
				// Feature disabled — ensure observer/timers from a prior page are cleaned up
				if (injectTimer) { clearTimeout(injectTimer); injectTimer = null; }
				actionBarObserver.disconnect();
			}
		} else {
			// Disconnect observer when leaving artist pages to avoid unnecessary work
			if (injectTimer) { clearTimeout(injectTimer); injectTimer = null; }
			actionBarObserver.disconnect();
		}
	}

	// ── MutationObserver (primary injection trigger) ────────────
	// Only active while on an artist page. Connected/disconnected by handleNavigation.
	let injectTimer: ReturnType<typeof setTimeout> | null = null;
	const actionBarObserver = new MutationObserver((mutations) => {
		if (!currentTargetArtistId) return;
		if (document.getElementById("stats-artist-inject-btn")) return;

		// Fast path: detect action bar node appearing directly
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType !== 1) continue;
				const el = node as Element;
				const cn = typeof el.className === "string" ? el.className : "";
				if (
					cn.includes("main-actionBar-ActionBarRow") ||
					el.querySelector?.(".main-actionBar-ActionBarRow") ||
					el.querySelector?.('[data-testid="action-bar-row"]')
				) {
					if (injectTimer) { clearTimeout(injectTimer); injectTimer = null; }
					insertArtistButton();
					return;
				}
			}
		}

		// Slow path: debounced retry for any other mutation
		if (injectTimer) return;
		injectTimer = setTimeout(() => {
			injectTimer = null;
			insertArtistButton();
		}, 150);
	});
	// Observer starts disconnected — handleNavigation connects it on artist pages

	// Listen for live config toggle of the Artist Stats button
	window.addEventListener("stats:artist-button-toggle", ((e: CustomEvent<boolean>) => {
		if (e.detail === false) {
			// Immediately clean up: remove button, hide fallback, clear timers, disconnect observer
			removeInjectedArtistButton();
			artistStats.element.style.display = "none";
			if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
			if (injectTimer) { clearTimeout(injectTimer); injectTimer = null; }
			actionBarObserver.disconnect();
		} else {
			// Re-enable: if currently on an artist page, re-insert
			const [, type, uid] = History.location.pathname.split("/");
			if (type === "artist" && uid) {
				currentTargetArtistId = uid;
				actionBarObserver.observe(document.body, { childList: true, subtree: true });
				// Force bypass config check — Config may not be updated yet when callback fires
				insertArtistButton(true);
				// Fallback: if injection fails, show topbar button after 5s
				const fallbackId = uid;
				fallbackTimer = setTimeout(() => {
					fallbackTimer = null;
					if (currentTargetArtistId === fallbackId && !document.getElementById("stats-artist-inject-btn")) {
						artistStats.element.style.display = "";
					}
				}, 5000);
			}
		}
	}) as EventListener);

	handleNavigation(History.location.pathname);

	History.listen(({ pathname }: { pathname: string }) => {
		handleNavigation(pathname);
	});
})();
