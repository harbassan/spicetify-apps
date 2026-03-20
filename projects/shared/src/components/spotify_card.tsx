const React = window.Spicetify.React;

interface SpotifyCardProps {
	type: "artist" | "album" | "lastfm" | "playlist";
	uri: string;
	header: string;
	subheader: string;
	imageUrl?: string;
	artistUri?: string;
	badge?: string | React.ReactElement;
	provider?: "spotify" | "lastfm";
}

/**
 * renders a Spotify card component with contextual menu support
 * - for "lastfm" provider, the card opens external links instead of navigating within Spotify
 * - right-click triggers a context menu with type-specific actions (ArtistMenu, AlbumMenu, or PlaylistMenu)
 */
function SpotifyCard(props: SpotifyCardProps): React.ReactElement<HTMLDivElement> {
	// @ts-ignore
	const { Cards } = Spicetify.ReactComponent;
	const { FeatureCard: Card } = Cards;
	const { type, header, uri, imageUrl, subheader, artistUri, badge, provider = "spotify" } = props;
	const isSpotifyProvider = provider === "spotify";
	const safeHeader = typeof header === "string" ? header : String(header ?? "");
	const safeSubheader = typeof subheader === "string" ? subheader : String(subheader ?? "");

	const openItem = () => {
		if (!isSpotifyProvider) {
			window.open(uri, "_blank");
			return;
		}

		Spicetify.Platform.History.push(`/${type}/${uri.split(":").at(-1)}`);
	};

	const nativeCard = (
		<Card
			featureIdentifier={type}
			headerText={safeHeader}
			renderCardImage={() => (
				<div className={`stats-spotifyCard-imageFrame${type === "artist" ? " is-artist" : ""}`}>
					{imageUrl ? <img className="stats-spotifyCard-image" src={imageUrl} alt={safeHeader} /> : null}
				</div>
			)}
			renderSubHeaderContent={() => (
				<div className="main-type-mesto stats-spotifyCard-subheader">
					{safeSubheader}
				</div>
			)}
			uri={uri}
		/>
	);

	return (
		<div className={`stats-spotifyCard stats-spotifyCard--${type}`} style={{ position: "relative" }}>
			{isSpotifyProvider ? (
				nativeCard
			) : (
				<button
					className="stats-spotifyCard-fallback"
					type="button"
					onClick={openItem}
				>
					<div className={`stats-spotifyCard-imageFrame${type === "artist" ? " is-artist" : ""}`}>
						{imageUrl ? <img className="stats-spotifyCard-image" src={imageUrl} alt={safeHeader} /> : null}
					</div>
					<div className="stats-spotifyCard-copy">
						<div className="stats-spotifyCard-title">{safeHeader}</div>
						<div className="stats-spotifyCard-subheader">{safeSubheader}</div>
					</div>
				</button>
			)}
			{badge && <div className="badge">{badge}</div>}
		</div>
	);
}

export default SpotifyCard;
