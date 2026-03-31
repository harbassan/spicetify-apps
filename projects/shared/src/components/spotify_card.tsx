import React from "react";

interface CardImageProps {
	imageUrl?: string;
	type: "artist" | "album" | "lastfm" | "playlist";
	fallbackLabel: string;
}

function CardImage({ imageUrl, type, fallbackLabel }: CardImageProps): React.ReactElement {
	const [imageFailed, setImageFailed] = React.useState(false);
	const [imageLoaded, setImageLoaded] = React.useState(false);
	const imageClassName = type === "artist" ? "stats-plain-card-image is-circular" : "stats-plain-card-image";
	const hasImage = imageUrl && !imageFailed;

	return (
		<div className={imageClassName}>
			<div className="stats-plain-card-imageFallback" aria-hidden="true" style={hasImage && imageLoaded ? { opacity: 0 } : undefined}>
				<span className="stats-plain-card-imageFallbackLabel">{fallbackLabel}</span>
			</div>
			{hasImage && (
				<img
					src={imageUrl}
					alt=""
					loading="lazy"
					onLoad={() => setImageLoaded(true)}
					onError={() => setImageFailed(true)}
					style={{ opacity: imageLoaded ? 1 : 0 }}
				/>
			)}
		</div>
	);
}

interface SpotifyCardProps {
	type: "artist" | "album" | "lastfm" | "playlist";
	uri: string;
	header: string;
	subheader: string;
	imageUrl?: string;
	badge?: string | React.ReactElement;
	provider?: "spotify" | "lastfm";
	onClickOverride?: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

function SpotifyCard(props: SpotifyCardProps): React.ReactElement<HTMLDivElement> {
	const { type, header, uri, imageUrl, subheader, badge, provider = "spotify", onClickOverride } = props;

	const fallbackLabel = header
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("") || "?";

	// Convert spotify:type:id URIs to /type/id paths for Spotify's router
	const parts = uri.split(":");
	const spotifyPath = parts.length >= 3 ? `/${parts[1]}/${parts.slice(2).join(":")}` : uri;

	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (onClickOverride) {
			event.preventDefault();
			onClickOverride(event);
			return;
		}

		if (provider === "lastfm") {
			return;
		}

		event.preventDefault();
		Spicetify.Platform.History.push(spotifyPath);
	};

	const cardHref = provider === "lastfm" ? uri : spotifyPath;

	return (
		<div className="stats-plain-card-wrapper">
			<a className="stats-plain-card" href={cardHref} onClick={handleClick} target={provider === "lastfm" ? "_blank" : undefined} rel={provider === "lastfm" ? "noopener noreferrer" : undefined}>
				<CardImage key={imageUrl ?? ""} imageUrl={imageUrl} type={type} fallbackLabel={fallbackLabel} />
				<div className="stats-plain-card-copy">
					<div className="stats-plain-card-title">{header}</div>
					<div className="stats-plain-card-subtitle">{subheader}</div>
				</div>
			</a>
			{badge && <div className="badge">{badge}</div>}
		</div>
	);
}

export default SpotifyCard;
