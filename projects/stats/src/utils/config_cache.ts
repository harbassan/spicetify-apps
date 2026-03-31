import type { Config } from "../types/stats_types";

export const getConfigCacheKey = (
	config: Config,
	options: { includeMusicBrainz?: boolean; includeLastfmIdentity?: boolean } = {},
) => {
	const source = config["lastfm-only"] ? "lastfm-only" : config["use-lastfm"] ? "lastfm" : "spotify";
	const parts = [
		`source:${source}`,
		`lfm-key:${config["api-key"] ? "1" : "0"}`,
		`lfm-user:${options.includeLastfmIdentity ? (config["lastfm-user"] ?? "") : "-"}`,
		`mb:${options.includeMusicBrainz && config["use-musicbrainz-genres"] ? "1" : "0"}`,
		`oauth:${config["use-oauth"] ? "1" : "0"}`,
		`direct:${config["use-direct-fetch"] ? "1" : "0"}`,
	];

	return parts.join("|");
};