const CACHE_TTL_MS = 60 * 60_000; // 1 hour

const checkForUpdates = (
	setNewUpdate: (a: boolean) => void,
	appName: string,
	version: string,
) => {
	const cacheKey = `${appName}:github-releases-cache`;
	const prefixWithV = `${appName}-v`;

	const processReleases = (result: { tag_name: string | null }[]) => {
		const releases = result.filter(
			(release): release is { tag_name: string } => release.tag_name?.startsWith(prefixWithV) === true,
		);
		if (releases.length === 0) return;
		setNewUpdate(releases[0].tag_name.slice(prefixWithV.length) !== version);
	};

	try {
		const raw = sessionStorage.getItem(cacheKey);
		if (raw) {
			const cached = JSON.parse(raw) as { data: { tag_name: string | null }[]; ts: number };
			if (Date.now() - cached.ts < CACHE_TTL_MS) {
				processReleases(cached.data);
				return;
			}
		}
	} catch {
		// Corrupted cache — fall through to fetch
	}

	fetch("https://api.github.com/repos/harbassan/spicetify-apps/releases")
		.then((res) => {
			if (!res.ok) throw new Error(`GitHub API ${res.status}`);
			return res.json();
		})
		.then(
			(result) => {
				try {
					sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, ts: Date.now() }));
				} catch {
					// sessionStorage full or unavailable
				}
				processReleases(result);
			},
			(error) => {
				console.warn("Failed to check for updates", error);
			},
		);
};

export default checkForUpdates;
