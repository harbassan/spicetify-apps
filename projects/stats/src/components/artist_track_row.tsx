import React from "react";

interface ArtistTrackRowProps {
	index: number;
	name: string;
	stat: string;
	imageUrl?: string;
	uri?: string;
	href?: string;
	onClickOverride?: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

const InitialsFallback = ({ name }: { name: string }) => {
	const label = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("") || "?";
	return <div className="stats-artistTrackRow-artFallback">{label}</div>;
};

const PlayOverlay = ({ uri }: { uri: string }) => (
	<button
		type="button"
		className="stats-artistTrackRow-playOverlay"
		aria-label="Play"
		tabIndex={-1}
		onClick={(e) => {
			e.stopPropagation();
			e.preventDefault();
			Spicetify.Player.playUri(uri);
		}}
	>
		<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 24 24">
			<path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z" />
		</svg>
	</button>
);

const ArtistTrackRow = ({ index, name, stat, imageUrl, uri, href, onClickOverride }: ArtistTrackRowProps) => {
	const [imageFailed, setImageFailed] = React.useState(false);

	const showImage = imageUrl && !imageFailed;

	const artElement = (
		<div className="stats-artistTrackRow-art">
			{showImage ? (
				<img
					aria-hidden="true"
					draggable="false"
					loading="lazy"
					src={imageUrl}
					alt=""
					width="40"
					height="40"
					onError={() => setImageFailed(true)}
				/>
			) : (
				<InitialsFallback name={name} />
			)}
			{uri && <PlayOverlay uri={uri} />}
		</div>
	);

	const content = (
		<>
			<span className="stats-artistTrackRow-rank">{index}</span>
			{artElement}
			<span className="stats-artistTrackRow-name">{name}</span>
			<span className="stats-artistTrackRow-stat">{stat}</span>
		</>
	);

	// Spotify track: clickable row (navigates to track page)
	if (uri) {
		const handleClick = () => {
			Spicetify.PopupModal.hide?.();
			Spicetify.Platform.History.push(`/track/${uri.split(":").pop()}`);
		};

		const row = (
			<div
				className="stats-artistTrackRow"
				role="button"
				tabIndex={0}
				onClick={handleClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleClick();
					}
				}}
			>
				{content}
			</div>
		);

		return row;
	}

	// External link (Last.fm)
	if (href) {
		if (onClickOverride) {
			return (
				<div
					className="stats-artistTrackRow"
					role="button"
					tabIndex={0}
					onClick={onClickOverride}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onClickOverride(e);
						}
					}}
				>
					{content}
				</div>
			);
		}
		return (
			<a className="stats-artistTrackRow" href={href} target="_blank" rel="noopener noreferrer">
				{content}
			</a>
		);
	}

	// Fallback: non-interactive row
	return <div className="stats-artistTrackRow">{content}</div>;
};

export default React.memo(ArtistTrackRow);
