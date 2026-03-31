import React, { useCallback } from "react";
import StatCard from "../components/cards/stat_card";
import ChartCard from "../components/cards/chart_card";
import SpotifyCard from "@shared/components/spotify_card";
import ArtistTrackRow from "../components/artist_track_row";
import Shelf from "../components/shelf";
import useStatus from "@shared/status/useStatus";
import { usePopupQuery } from "../utils/usePopupQuery";
import { searchAndNavigate, resolveTrackUri } from "../utils/spotify_search";
import { getArtistOverview } from "../api/platform";
import { getArtistInfo, getArtistTopTags, getArtistGlobalTopTracks, getUserTopTracksForArtist } from "../api/lastfm";
import type { ArtistUnion, PlaylistAppearance } from "../types/artist_overview";

interface ArtistData {
	overview: ArtistUnion;
	lastfmInfo: {
		stats?: {
			listeners?: string;
			playcount?: string;
			userplaycount?: string;
		};
		tags?: {
			tag?: { name: string; url: string }[];
		};
		bio?: {
			summary?: string;
		};
	} | null;
	lastfmTags: { name: string; count: number }[];
}

const formatNumber = (num: number): string => {
	if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
	if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
	return num.toLocaleString();
};

const PLAYLIST_PREVIEW_COUNT = 6;
const TRACK_PREVIEW_COUNT = 10;

// ── Module-level caches ──────────────────────────────────────────────────────
// Survive modal close/reopen within the same Spotify session.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const MAX_CACHE_ENTRIES = 50;

/** Build a cache key that incorporates user-specific config so switching
 *  Last.fm username or API key invalidates stale entries. */
function userCacheKey(artistId: string): string {
	const config = window.SpicetifyStats?.ConfigWrapper?.Config;
	const user = config?.["lastfm-user"] ?? "";
	const apiKey = config?.["api-key"] ?? "";
	return `${artistId}|${user}|${apiKey}`;
}

const _mainCache     = new Map<string, { data: ArtistData; ts: number }>();
const _overviewCache = new Map<string, { data: ArtistUnion; ts: number }>();
const _playlistCache = new Map<string, { data: PlaylistAppearance[]; ts: number }>();
const _lfmTracksCache = new Map<string, { data: { name: string; playcount: string; listeners: string; url: string; imageUrl?: string }[]; ts: number }>();
const _userTracksCache = new Map<string, { data: { name: string; url: string; userPlaycount: number; imageUrl?: string }[]; ts: number }>();

/** Remove expired entries and enforce a size cap on any cache map. */
function pruneCache<T>(map: Map<string, { data: T; ts: number }>): void {
	const now = Date.now();
	for (const [key, entry] of map) {
		if (now - entry.ts >= CACHE_TTL_MS) map.delete(key);
	}
	// If still over the cap, drop oldest entries
	if (map.size > MAX_CACHE_ENTRIES) {
		const entries = [...map.entries()].sort((a, b) => a[1].ts - b[1].ts);
		const toDrop = entries.length - MAX_CACHE_ENTRIES;
		for (let i = 0; i < toDrop; i++) map.delete(entries[i][0]);
	}
}

/** Write to a cache map, pruning expired/overflow entries first. */
function toCache<T>(map: Map<string, { data: T; ts: number }>, key: string, data: T): void {
	pruneCache(map);
	map.set(key, { data, ts: Date.now() });
}

function fromCache<T>(map: Map<string, { data: T; ts: number }>, key: string): T | null {
	const entry = map.get(key);
	if (!entry) return null;
	if (Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
	map.delete(key);
	return null;
}

export function getCachedArtistName(artistId: string): string | null {
	const cached = fromCache(_mainCache, userCacheKey(artistId));
	return cached?.overview.profile.name ?? null;
}

/** Pre-populate the overview cache so ArtistPage skips the redundant GraphQL call. */
export function populateOverviewCache(artistId: string, overview: ArtistUnion): void {
	toCache(_overviewCache, artistId, overview);
}

const TooltipIcon = () => (
	<svg role="img" height="16" width="16" viewBox="0 0 16 16">
		<path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" />
		<path d="M7.25 12.026v-1.5h1.5v1.5h-1.5zm.884-7.096A1.125 1.125 0 007.06 6.39l-1.431.448a2.625 2.625 0 115.13-.784c0 .54-.156 1.015-.503 1.488-.3.408-.7.652-.973.818l-.112.068c-.185.116-.26.203-.302.283-.046.087-.097.245-.097.57h-1.5c0-.47.072-.898.274-1.277.206-.385.507-.645.827-.846l.147-.092c.285-.177.413-.257.526-.41.169-.23.213-.397.213-.602 0-.622-.503-1.125-1.125-1.125z" />
	</svg>
);



const ArtistPage = ({ uri }: { uri: string }) => {
	const artistId = uri.replace("spotify:artist:", "");

	const [playlistAppearances, setPlaylistAppearances] = React.useState<PlaylistAppearance[] | null>(
		() => fromCache(_playlistCache, `spotify:artist:${artistId}`));
	const [playlistProgress, setPlaylistProgress] = React.useState<{ current: number; total: number } | null>(null);
	const [playlistLoading, setPlaylistLoading] = React.useState(false);
	const [showAllPlaylists, setShowAllPlaylists] = React.useState(false);
	const [showAllLfmTracks, setShowAllLfmTracks] = React.useState(false);
	const [showAllUserTracks, setShowAllUserTracks] = React.useState(false);
	const [lfmTopTracks, setLfmTopTracks] = React.useState<{ name: string; playcount: string; listeners: string; url: string; imageUrl?: string }[] | null>(
		() => fromCache(_lfmTracksCache, userCacheKey(artistId)));
	const [lfmTopTracksLoading, setLfmTopTracksLoading] = React.useState(false);
	const [userTopTracks, setUserTopTracks] = React.useState<{ name: string; url: string; userPlaycount: number; imageUrl?: string }[] | null>(
		() => fromCache(_userTracksCache, userCacheKey(artistId)));
	const [userTopTracksLoading, setUserTopTracksLoading] = React.useState(false);
	const [resolvedUris, setResolvedUris] = React.useState<Map<string, string>>(new Map());
	const isMountedRef = React.useRef(true);
	const lfmLoadingRef = React.useRef(false);
	const userLoadingRef = React.useRef(false);
	const attemptedUrisRef = React.useRef<Set<string>>(new Set());

	React.useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// Close modal on Esc key
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !e.defaultPrevented) {
				Spicetify.PopupModal.hide?.();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Read config inside callback body to avoid unstable config reference in deps
	// Note: getArtistOverview uses Spicetify's internal GraphQL (Spicetify.GraphQL.Request),
	// not the rate-limited public Spotify Web API. It is intentionally exempt from the
	// "lastfm-only" setting, which only gates public API calls on Stats chart/list pages.
	const fetchData = useCallback(async (): Promise<ArtistData> => {
		const cached = fromCache(_mainCache, userCacheKey(artistId));
		if (cached) return cached;

		const overview = fromCache(_overviewCache, artistId)
			?? await getArtistOverview(`spotify:artist:${artistId}`);
		const config = window.SpicetifyStats?.ConfigWrapper?.Config;

		let lastfmInfo = null;
		let lastfmTags: { name: string; count: number }[] = [];
		if (config?.["api-key"]) {
			try {
				const [info, tags] = await Promise.all([
					getArtistInfo(config["api-key"], overview.profile.name, config["lastfm-user"] || undefined),
					getArtistTopTags(config["api-key"], overview.profile.name),
				]);
				lastfmInfo = info;
				lastfmTags = tags;
			} catch {
				// Last.fm failure is non-fatal — show Spotify data only
			}
		}
		const result = { overview, lastfmInfo, lastfmTags };
		toCache(_mainCache, userCacheKey(artistId), result);
		return result;
	}, [artistId]);

	const { status, error, data } = usePopupQuery(fetchData, fromCache(_mainCache, userCacheKey(artistId)) ?? undefined);

	// Playlist scanning closure — needs access to setPlaylistProgress (component state)
	const scanPlaylists = React.useCallback(
		async (artistUri: string) => {
			setPlaylistLoading(true);
			setPlaylistProgress(null);
			try {
				const rootlist = await Spicetify.Platform.RootlistAPI.getContents({ flatten: true });
				const playlists = (rootlist as { items?: { uri: string; name: string; type: string }[] }).items
					?.filter((i: { type: string }) => i.type === "playlist")
					 ?? [];
				const results: PlaylistAppearance[] = [];
				const CONCURRENCY = 5;

				for (let i = 0; i < playlists.length; i += CONCURRENCY) {
					if (!isMountedRef.current) break;
					setPlaylistProgress({ current: Math.min(i + CONCURRENCY, playlists.length), total: playlists.length });
					const batch = playlists.slice(i, i + CONCURRENCY);
					const batchResults = await Promise.allSettled(
						batch.map(async (pl: { uri: string; name: string; type: string }) => {
							const playlistData = await Spicetify.Platform.PlaylistAPI.getPlaylist(pl.uri);
							const pd = playlistData as any;
							const imageUrl: string | undefined =
								pd?.metadata?.images?.[0]?.url ??
								pd?.images?.[0]?.url ??
								undefined;
							const items = (playlistData as { contents?: { items?: { artists?: { uri: string }[] }[] } }).contents?.items ?? [];
							const matchCount = items.filter(
								(t: { artists?: { uri: string }[] }) => t.artists?.some((a: { uri: string }) => a.uri === artistUri),
							).length;
							return matchCount > 0 ? { uri: pl.uri, name: pl.name, type: pl.type, matchCount, imageUrl } : null;
						}),
					);
					for (const result of batchResults) {
						if (result.status === "fulfilled" && result.value) {
							results.push(result.value);
						}
					}
				}
				if (isMountedRef.current) {
					toCache(_playlistCache, artistUri, results);
					setPlaylistAppearances(results);
				}
			} catch {
				if (isMountedRef.current) {
					setPlaylistAppearances([]);
				}
			} finally {
				if (isMountedRef.current) {
					setPlaylistLoading(false);
					setPlaylistProgress(null);
				}
			}
		},
		[],
	);

	// Auto-load playlist appearances after main data loads (if config enabled)
	React.useEffect(() => {
		if (status !== "success" || !data) return;
		const config = window.SpicetifyStats?.ConfigWrapper?.Config;
		const autoLoad = config?.["auto-load-playlist-appearances"] !== false;
		if (autoLoad && playlistAppearances === null && !playlistLoading) {
			scanPlaylists(`spotify:artist:${artistId}`);
		}
	}, [status, data, artistId, scanPlaylists, playlistAppearances, playlistLoading]);

	const handleLoadPlaylists = (e: React.MouseEvent) => {
		e.stopPropagation();
		scanPlaylists(`spotify:artist:${artistId}`);
	};

	const loadLfmTopTracks = React.useCallback(async () => {
		if (lfmLoadingRef.current) return;
		const config = window.SpicetifyStats?.ConfigWrapper?.Config;
		if (!config?.["api-key"] || !data?.overview?.profile?.name) return;
		lfmLoadingRef.current = true;
		setLfmTopTracksLoading(true);
		try {
			const tracks = await getArtistGlobalTopTracks(config["api-key"], data.overview.profile.name);
			if (isMountedRef.current) {
				toCache(_lfmTracksCache, userCacheKey(artistId), tracks);
				setLfmTopTracks(tracks);
			}
		} catch {
			if (isMountedRef.current) setLfmTopTracks([]);
		} finally {
			lfmLoadingRef.current = false;
			if (isMountedRef.current) setLfmTopTracksLoading(false);
		}
	}, [artistId, data]);

	const handleLoadLfmTopTracks = (e: React.MouseEvent) => {
		e.stopPropagation();
		loadLfmTopTracks();
	};

	const loadUserTopTracks = React.useCallback(async () => {
		if (userLoadingRef.current) return;
		const config = window.SpicetifyStats?.ConfigWrapper?.Config;
		if (!config?.["api-key"] || !config?.["lastfm-user"] || !data?.overview?.profile?.name) return;
		userLoadingRef.current = true;
		setUserTopTracksLoading(true);
		try {
			const tracks = await getUserTopTracksForArtist(
				config["api-key"],
				data.overview.profile.name,
				config["lastfm-user"],
			);
			if (isMountedRef.current) {
				toCache(_userTracksCache, userCacheKey(artistId), tracks);
				setUserTopTracks(tracks);
			}
		} catch {
			if (isMountedRef.current) setUserTopTracks([]);
		} finally {
			userLoadingRef.current = false;
			if (isMountedRef.current) setUserTopTracksLoading(false);
		}
	}, [artistId, data]);

	const handleLoadUserTopTracks = (e: React.MouseEvent) => {
		e.stopPropagation();
		loadUserTopTracks();
	};

	// Auto-load Last.fm top tracks
	React.useEffect(() => {
		if (status !== "success" || !data) return;
		const config = window.SpicetifyStats?.ConfigWrapper?.Config;
		if (!config?.["api-key"]) return;
		const autoLoad = config?.["auto-load-lastfm-top-tracks"] === true;
		if (autoLoad && lfmTopTracks === null && !lfmTopTracksLoading) {
			loadLfmTopTracks();
		}
	}, [status, data, loadLfmTopTracks, lfmTopTracks, lfmTopTracksLoading]);

	// Auto-load user top scrobbled tracks
	React.useEffect(() => {
		if (status !== "success" || !data) return;
		const config = window.SpicetifyStats?.ConfigWrapper?.Config;
		if (!config?.["api-key"] || !config?.["lastfm-user"]) return;
		const autoLoad = config?.["auto-load-user-top-tracks"] === true;
		if (autoLoad && userTopTracks === null && !userTopTracksLoading) {
			loadUserTopTracks();
		}
	}, [status, data, loadUserTopTracks, userTopTracks, userTopTracksLoading]);

	// Background-resolve Spotify URIs for Last.fm tracks so clicks navigate
	// instantly without hitting search API rate limits.
	// Keys use "name::url" to avoid collisions on duplicate track names (e.g. "Intro").
	React.useEffect(() => {
		const config = window.SpicetifyStats?.ConfigWrapper?.Config;
		if (config?.["prefer-spotify-links"] !== true) return;

		const allTracks: { name: string; url: string }[] = [
			...(lfmTopTracks ?? []),
			...(userTopTracks ?? []),
		];
		// Only resolve tracks we haven't already attempted
		const unresolved = allTracks.filter((t) => !attemptedUrisRef.current.has(`${t.name}::${t.url}`));
		if (unresolved.length === 0) return;

		const artistName = data?.overview?.profile?.name;
		if (!artistName) return;

		let cancelled = false;
		(async () => {
			for (const track of unresolved) {
				if (cancelled || !isMountedRef.current) break;
				const key = `${track.name}::${track.url}`;
				attemptedUrisRef.current.add(key);
				try {
					const uri = await resolveTrackUri(track.name, artistName);
					if (cancelled || !isMountedRef.current) break;
					if (uri) {
						setResolvedUris((prev) => {
							const next = new Map(prev);
							next.set(key, uri);
							return next;
						});
					}
				} catch {
					// Rate limited or suppressed — stop the entire loop
					break;
				}
				// Stagger requests to avoid rate limits
				if (!cancelled) await new Promise((r) => setTimeout(r, 800));
			}
		})();

		return () => { cancelled = true; };
	}, [lfmTopTracks, userTopTracks, data]);

	const Status = useStatus(status, error);
	if (Status) return Status;

	const { overview, lastfmInfo, lastfmTags } = data as NonNullable<typeof data>;
	const config = window.SpicetifyStats?.ConfigWrapper?.Config;
	const hasLastFm = Boolean(config?.["api-key"]);
	const hasLastFmUser = Boolean(config?.["api-key"] && config?.["lastfm-user"]);
	const autoLoadPlaylists = config?.["auto-load-playlist-appearances"] !== false;
	const autoLoadLfmTopTracks = config?.["auto-load-lastfm-top-tracks"] === true;
	const autoLoadUserTopTracks = config?.["auto-load-user-top-tracks"] === true;

	// Compute estimated listening time from user scrobbles
	let estimatedListeningTime: string | null = null;
	if (lastfmInfo?.stats?.userplaycount) {
		const userScrobbles = Number(lastfmInfo.stats.userplaycount);
		const topTracks = overview.discography?.topTracks?.items ?? [];
		if (userScrobbles > 0 && topTracks.length > 0) {
			const totalMs = topTracks.reduce((sum, t) => sum + (t.track?.duration?.totalMilliseconds ?? 0), 0);
			const avgMs = totalMs / topTracks.length;
			const totalMinutes = Math.round((userScrobbles * avgMs) / 60000);
			if (totalMinutes >= 60) {
				estimatedListeningTime = `${(totalMinutes / 60).toFixed(1)} hrs`;
			} else {
				estimatedListeningTime = `${totalMinutes} min`;
			}
		}
	}

	// Build genre chart data from Last.fm tags (filter out 0-count tags)
	const genreData: Record<string, number> = {};
	if (lastfmTags.length > 0) {
		const nonZeroTags = lastfmTags.filter((tag) => tag.count > 0);
		for (const tag of nonZeroTags.slice(0, 20)) {
			genreData[tag.name] = tag.count;
		}
	}

	// Top tracks from Spotify
	const topTracks = overview.discography?.topTracks?.items?.slice(0, 10) ?? [];

	// Discography albums + singles
	const albums = overview.discography?.albums?.items ?? [];
	const singles = overview.discography?.singles?.items ?? [];

	// Related artists
	const relatedArtists = overview.relatedContent?.relatedArtists?.items ?? [];

	const navigateFromModal = (uri: string) => {
		Spicetify.PopupModal.hide?.();
		const parts = uri.split(":");
		const path = parts.length >= 3 ? `/${parts[1]}/${parts.slice(2).join(":")}` : uri;
		Spicetify.Platform.History.push(path);
	};

	const albumCards = albums.slice(0, 10).map((album) => {
		const release = album.releases?.items?.[0];
		if (!release) return null;
		return (
			<SpotifyCard
				key={release.uri}
				type="album"
				uri={release.uri}
				header={release.name}
				subheader={`${release.date?.year ?? "Unknown"} \u00B7 ${release.tracks?.totalCount ?? 0} tracks`}
				imageUrl={release.coverArt?.sources?.[0]?.url}
				onClickOverride={() => navigateFromModal(release.uri)}
			/>
		);
	}).filter(Boolean);

	const singleCards = singles.slice(0, 10).map((single) => {
		const release = single.releases?.items?.[0];
		if (!release) return null;
		return (
			<SpotifyCard
				key={release.uri}
				type="album"
				uri={release.uri}
				header={release.name}
				subheader={`${release.date?.year ?? "Unknown"}`}
				imageUrl={release.coverArt?.sources?.[0]?.url}
				onClickOverride={() => navigateFromModal(release.uri)}
			/>
		);
	}).filter(Boolean);

	const relatedArtistCards = relatedArtists.slice(0, 10).map((artist) => (
		<SpotifyCard
			key={artist.uri}
			type="artist"
			uri={artist.uri}
			header={artist.profile.name}
			subheader="Related Artist"
			imageUrl={artist.visuals?.avatarImage?.sources?.[0]?.url}
			onClickOverride={() => navigateFromModal(artist.uri)}
		/>
	));

	const playlistCards = (playlistAppearances ?? []).map((pl) => (
		<SpotifyCard
			key={pl.uri}
			type="playlist"
			uri={pl.uri}
			header={pl.name}
			subheader={`Appears in ${pl.matchCount} track${pl.matchCount !== 1 ? "s" : ""}`}
			imageUrl={pl.imageUrl}
			onClickOverride={() => navigateFromModal(pl.uri)}
		/>
	));

	const preferSpotifyLinks = config?.["prefer-spotify-links"] === true;
	const artistName = overview.profile?.name ?? "";

	return (
		<div id="stats-app" className="page-content encore-dark-theme encore-base-set">
		<div id="stats-artist-page">
			{/* Artist-level stats */}
			<section className="stats-artistOverview">
				<StatCard label="Monthly Listeners" value={formatNumber(overview.stats?.monthlyListeners ?? 0)} />
				<StatCard label="Followers" value={formatNumber(overview.stats?.followers ?? 0)} />
				{overview.stats?.worldRank > 0 && (
					<StatCard label="World Rank" value={`#${overview.stats.worldRank}`} />
				)}
				<StatCard label="Albums" value={overview.discography?.albums?.totalCount ?? 0} />
				<StatCard label="Singles" value={overview.discography?.singles?.totalCount ?? 0} />
			</section>

			{/* User-level stats - only rendered if any user data available */}
			{(Number(lastfmInfo?.stats?.userplaycount) > 0 || estimatedListeningTime) && (
				<section className="stats-artistOverview-userRow">
					{Number(lastfmInfo?.stats?.userplaycount) > 0 && (
						<StatCard label="Your Scrobbles" value={formatNumber(Number(lastfmInfo?.stats?.userplaycount))} />
					)}
					{estimatedListeningTime && (
						<StatCard label="Est. Listening Time" value={estimatedListeningTime} />
					)}
				</section>
			)}

			{/* Genres */}
			<Shelf title="Genres">
				{hasLastFm && Object.keys(genreData).length > 0 ? (
					<ChartCard data={genreData} />
				) : (
					<div className="main-card-card stats-genreCard stats-genreCardEmpty">
						{hasLastFm
							? "No genre data available"
							: <>No genre data available{" "}
							{Spicetify.ReactComponent?.TooltipWrapper ? (
								<Spicetify.ReactComponent.TooltipWrapper
									label={<div>Connect Last.fm in Stats settings for richer genre data</div>}
									renderInline={true}
									showDelay={10}
									placement="top"
									labelClassName="tooltip"
									disabled={false}
								>
									<span className="stats-genreTooltip"><TooltipIcon /></span>
								</Spicetify.ReactComponent.TooltipWrapper>
							) : (
								<span className="stats-genreTooltip" title="Connect Last.fm in Stats settings for richer genre data"><TooltipIcon /></span>
							)}
						</>
						}
					</div>
				)}
			</Shelf>

			{/* Playlist Appearances */}
			<Shelf title="Playlist Appearances">
				{playlistLoading ? (
					<div>
						<div className="stats-playlistProgress">
							{playlistProgress
								? `Scanning playlist ${playlistProgress.current} of ${playlistProgress.total}...`
								: "Starting scan..."
							}
						</div>
					</div>
				) : playlistAppearances !== null ? (
					playlistCards.length > 0 ? (
						<>
							<div className="main-gridContainer-gridContainer grid">
								{showAllPlaylists ? playlistCards : playlistCards.slice(0, PLAYLIST_PREVIEW_COUNT)}
							</div>
							{playlistCards.length > PLAYLIST_PREVIEW_COUNT && (
								<button
									type="button"
									className="stats-seeMoreBtn"
									onClick={() => setShowAllPlaylists((v) => !v)}
								>
									{showAllPlaylists ? "Show fewer" : `Show all ${playlistCards.length} playlists`}
								</button>
							)}
						</>
					) : (
						<div className="main-card-card stats-genreCard stats-genreCardEmpty">
							No playlist appearances found
						</div>
					)
				) : !autoLoadPlaylists ? (
					<button type="button" className="stats-playlistAppearances-loadBtn" onClick={handleLoadPlaylists}>
						Load Playlist Appearances
					</button>
				) : null}
			</Shelf>

			{/* Spotify Top Tracks */}
			{topTracks.length > 0 && (
				<Shelf title="Top Tracks">
					<div className="stats-lfmTrackList">
						{topTracks.map((item, idx) => (
							<ArtistTrackRow
								key={item.track?.uri ?? idx}
								index={idx + 1}
								name={item.track?.name ?? "Unknown"}
								stat={`${item.track?.playcount ? formatNumber(Number(item.track.playcount)) : "N/A"} plays`}
								uri={item.track?.uri}
								imageUrl={item.track?.album?.coverArt?.sources?.[0]?.url ?? item.track?.albumOfTrack?.coverArt?.sources?.[0]?.url}
							/>
						))}
					</div>
				</Shelf>
			)}

			{/* Last.fm Global Top Tracks */}
			{hasLastFm && (
				<Shelf title="Last.fm Global Top Tracks">
					{lfmTopTracks === null ? (
						!autoLoadLfmTopTracks ? (
							<button
								type="button"
								className="stats-lfmTopTracks-loadBtn"
								onClick={handleLoadLfmTopTracks}
								disabled={lfmTopTracksLoading}
							>
								{lfmTopTracksLoading ? "Loading..." : "Load Last.fm Top Tracks"}
							</button>
						) : lfmTopTracksLoading ? (
							<div className="stats-playlistProgress">Loading Last.fm top tracks...</div>
						) : null
					) : lfmTopTracks.length > 0 ? (
						<>
						<div className="stats-lfmTrackList">
							{(showAllLfmTracks ? lfmTopTracks : lfmTopTracks.slice(0, TRACK_PREVIEW_COUNT)).map((track, idx) => {
								const resolved = resolvedUris.get(`${track.name}::${track.url}`);
								return (
									<ArtistTrackRow
										key={`${track.name}-${idx}`}
										index={idx + 1}
										name={track.name}
										stat={`${formatNumber(Number(track.listeners))} listeners`}
										imageUrl={track.imageUrl}
										uri={resolved}
										href={resolved ? undefined : track.url}
										onClickOverride={!resolved && preferSpotifyLinks ? (e) => {
											e.preventDefault();
											Spicetify.PopupModal.hide?.();
											searchAndNavigate("track", track.name, track.url, artistName);
										} : undefined}
									/>
								);
							})}
						</div>
						{lfmTopTracks.length > TRACK_PREVIEW_COUNT && (
							<button
								type="button"
								className="stats-seeMoreBtn"
								onClick={() => setShowAllLfmTracks((v) => !v)}
							>
								{showAllLfmTracks ? "Show fewer" : `Show all ${lfmTopTracks.length} tracks`}
							</button>
						)}
						</>
					) : (
						<div className="main-card-card stats-genreCard stats-genreCardEmpty">
							No Last.fm top tracks available
						</div>
					)}
				</Shelf>
			)}

			{/* Your Top Scrobbled Tracks */}
			{hasLastFmUser && (
				<Shelf title="Your Top Scrobbled Tracks">
					{userTopTracks === null ? (
						!autoLoadUserTopTracks ? (
							<button
								type="button"
								className="stats-lfmTopTracks-loadBtn"
								onClick={handleLoadUserTopTracks}
								disabled={userTopTracksLoading}
							>
								{userTopTracksLoading ? "Loading..." : "Load My Top Tracks"}
							</button>
						) : userTopTracksLoading ? (
							<div className="stats-playlistProgress">Loading your top scrobbled tracks...</div>
						) : null
					) : userTopTracks.length > 0 ? (
						<>
						<div className="stats-lfmTrackList">
							{(showAllUserTracks ? userTopTracks : userTopTracks.slice(0, TRACK_PREVIEW_COUNT)).map((track, idx) => {
								const resolved = resolvedUris.get(`${track.name}::${track.url}`);
								return (
									<ArtistTrackRow
										key={`${track.name}-${idx}`}
										index={idx + 1}
										name={track.name}
										stat={`${formatNumber(track.userPlaycount)} scrobbles`}
										imageUrl={track.imageUrl}
										uri={resolved}
										href={resolved ? undefined : track.url}
										onClickOverride={!resolved && preferSpotifyLinks ? (e) => {
											e.preventDefault();
											Spicetify.PopupModal.hide?.();
											searchAndNavigate("track", track.name, track.url, artistName);
										} : undefined}
									/>
								);
							})}
						</div>
						{userTopTracks.length > TRACK_PREVIEW_COUNT && (
							<button
								type="button"
								className="stats-seeMoreBtn"
								onClick={() => setShowAllUserTracks((v) => !v)}
							>
								{showAllUserTracks ? "Show fewer" : `Show all ${userTopTracks.length} tracks`}
							</button>
						)}
						</>
					) : (
						<div className="main-card-card stats-genreCard stats-genreCardEmpty">
							No scrobble data found for this artist
						</div>
					)}
				</Shelf>
			)}

			{/* Discography: Albums */}
			{albumCards.length > 0 && (
				<Shelf title="Albums">
					<div className="main-gridContainer-gridContainer grid">{albumCards}</div>
				</Shelf>
			)}

			{/* Discography: Singles */}
			{singleCards.length > 0 && (
				<Shelf title="Singles & EPs">
					<div className="main-gridContainer-gridContainer grid">{singleCards}</div>
				</Shelf>
			)}

			{/* Related Artists */}
			{relatedArtistCards.length > 0 && (
				<Shelf title="Related Artists">
					<div className="main-gridContainer-gridContainer grid">{relatedArtistCards}</div>
				</Shelf>
			)}
		</div>
		</div>
	);
};

export default React.memo(ArtistPage);
