import { describe, it, expect } from "vitest";
import { getConfigCacheKey } from "../config_cache";
import type { Config } from "../../types/stats_types";

const makeConfig = (overrides: Partial<Config> = {}): Config => ({
	"api-key": "",
	"lastfm-user": "",
	"use-lastfm": false,
	"lastfm-only": false,
	"use-musicbrainz-genres": false,
	"use-oauth": false,
	"use-direct-fetch": false,
	"oauth-client-id": null,
	"oauth-callback": null,
	"oauth-disconnect": false,
	"show-debug-console": false,
	"show-artists": true,
	"show-tracks": true,
	"show-albums": true,
	"show-genres": true,
	"show-library": true,
	"show-charts": true,
	"auto-load-playlist-appearances": false,
	"auto-load-lastfm-top-tracks": false,
	"auto-load-user-top-tracks": false,
	"prefer-spotify-links": false,
	"show-artist-stats-button": false,
	"artist-stats-button-order": 0,
	...overrides,
});

describe("getConfigCacheKey", () => {
	it("produces correct key for default spotify-only config", () => {
		const key = getConfigCacheKey(makeConfig());
		expect(key).toBe("source:spotify|lfm-key:0|lfm-user:-|mb:0|oauth:0|direct:0");
	});

	it("detects lastfm source when use-lastfm is true", () => {
		const key = getConfigCacheKey(makeConfig({ "use-lastfm": true }));
		expect(key).toContain("source:lastfm|");
	});

	it("detects lastfm-only source (takes precedence over use-lastfm)", () => {
		const key = getConfigCacheKey(makeConfig({ "use-lastfm": true, "lastfm-only": true }));
		expect(key).toContain("source:lastfm-only|");
	});

	it("reflects api-key presence", () => {
		const withKey = getConfigCacheKey(makeConfig({ "api-key": "secret123" }));
		const withoutKey = getConfigCacheKey(makeConfig({ "api-key": "" }));
		expect(withKey).toContain("lfm-key:1");
		expect(withoutKey).toContain("lfm-key:0");
	});

	it("includes lastfm-user when includeLastfmIdentity is true", () => {
		const key = getConfigCacheKey(makeConfig({ "lastfm-user": "bob" }), { includeLastfmIdentity: true });
		expect(key).toContain("lfm-user:bob");
	});

	it("masks lastfm-user as '-' when includeLastfmIdentity is false", () => {
		const key = getConfigCacheKey(makeConfig({ "lastfm-user": "bob" }), { includeLastfmIdentity: false });
		expect(key).toContain("lfm-user:-");
	});

	it("masks lastfm-user as '-' by default", () => {
		const key = getConfigCacheKey(makeConfig({ "lastfm-user": "bob" }));
		expect(key).toContain("lfm-user:-");
	});

	it("includes musicbrainz flag when both config and options enable it", () => {
		const key = getConfigCacheKey(makeConfig({ "use-musicbrainz-genres": true }), { includeMusicBrainz: true });
		expect(key).toContain("mb:1");
	});

	it("excludes musicbrainz flag when option is missing", () => {
		const key = getConfigCacheKey(makeConfig({ "use-musicbrainz-genres": true }));
		expect(key).toContain("mb:0");
	});

	it("excludes musicbrainz flag when config is false", () => {
		const key = getConfigCacheKey(makeConfig({ "use-musicbrainz-genres": false }), { includeMusicBrainz: true });
		expect(key).toContain("mb:0");
	});

	it("reflects oauth flag", () => {
		const key = getConfigCacheKey(makeConfig({ "use-oauth": true }));
		expect(key).toContain("oauth:1");
	});

	it("reflects direct-fetch flag", () => {
		const key = getConfigCacheKey(makeConfig({ "use-direct-fetch": true }));
		expect(key).toContain("direct:1");
	});

	it("produces deterministic keys (same config => same key)", () => {
		const cfg = makeConfig({ "use-lastfm": true, "api-key": "k", "lastfm-user": "u" });
		const opts = { includeLastfmIdentity: true, includeMusicBrainz: true };
		expect(getConfigCacheKey(cfg, opts)).toBe(getConfigCacheKey(cfg, opts));
	});

	it("produces different keys for different configs", () => {
		const a = getConfigCacheKey(makeConfig({ "use-lastfm": true }));
		const b = getConfigCacheKey(makeConfig({ "use-lastfm": false }));
		expect(a).not.toBe(b);
	});
});
