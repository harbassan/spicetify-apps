import React from "react";

interface CustomCardProps {
	type: "folder" | "show" | "collection" | "localalbum" | "localfiles" | "artist";
	uri: string;
	header: string;
	subheader: string;
	imageUrl?: string;
	badge?: string | React.ReactElement;
	onClick?: (e: React.MouseEvent) => void;
}

function CustomCard(props: CustomCardProps): React.ReactElement<HTMLDivElement> {
	const { type, header, uri, imageUrl, subheader, badge } = props;
	const [imageFailed, setImageFailed] = React.useState(false);
	React.useEffect(() => {
		setImageFailed(false);
	}, [imageUrl]);
	const isCollection = type === "collection" || type === "folder";

	const fallbackLabel = header
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("") || "?";

	const handleClick = () => {
		switch (type) {
			case "folder":
				Spicetify.Platform.History.replace(`/library/Playlists/${uri}`);
				Spicetify.LocalStorage.set("library:active-link", `Playlists/${uri}`);
				break;
			case "collection":
				Spicetify.Platform.History.replace(`/library/Collections/${uri}`);
				Spicetify.LocalStorage.set("library:active-link", `Collections/${uri}`);
				break;
			case "localalbum":
				Spicetify.Platform.History.push({ pathname: "/better-local-files/album", state: { uri } });
				break;
			case "localfiles": {
				const parts = uri.split(":");
				const path = parts.length >= 3 ? `/${parts[1]}/${parts.slice(2).join(":")}` : uri;
				Spicetify.Platform.History.push(path);
				break;
			}
			case "show": {
				const parts = uri.split(":");
				const path = parts.length >= 3 ? `/${parts[1]}/${parts.slice(2).join(":")}` : uri;
				Spicetify.Platform.History.push(path);
				break;
			}
			case "artist": {
				const artistParts = uri.split(":");
				const artistPath = artistParts.length >= 3 ? `/${artistParts[1]}/${artistParts.slice(2).join(":")}` : uri;
				Spicetify.Platform.History.push(artistPath);
				break;
			}
		}
	};

	return (
		<div className="stats-plain-card-wrapper">
			<button className="stats-plain-card" type="button" onClick={props.onClick || handleClick}>
				<div className="stats-plain-card-image">
					{imageUrl && !imageFailed ? (
						<img src={imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
					) : isCollection ? (
						<div className="stats-plain-card-imageFallback stats-folder-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
								<path d="M1 4a2 2 0 0 1 2-2h5.155a3 3 0 0 1 2.598 1.5l.866 1.5H21a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4zm7.155 0H3v16h18V7H10.464L9.021 4.5a1 1 0 0 0-.866-.5z"/>
							</svg>
						</div>
					) : type === "localfiles" ? (
						<div className="stats-plain-card-imageFallback stats-localfiles-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
								<path d="M6 3h15v15.167a3.5 3.5 0 1 1-3.5-3.5H19V5H8v10.167a3.5 3.5 0 1 1-3.5-3.5H6V3zM4.5 13.667a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm13 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
							</svg>
						</div>
					) : (
						<div className="stats-plain-card-imageFallback" aria-hidden="true">
							<span className="stats-plain-card-imageFallbackLabel">{fallbackLabel}</span>
						</div>
					)}
				</div>
				<div className="stats-plain-card-copy">
					<div className="stats-plain-card-title">{header}</div>
					<div className="stats-plain-card-subtitle">{subheader}</div>
				</div>
			</button>
			{badge && <div className="badge">{badge}</div>}
		</div>
	);
}

export default CustomCard;
