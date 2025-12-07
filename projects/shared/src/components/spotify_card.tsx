import React from "react";

interface SpotifyCardProps {
	type: "artist" | "album" | "lastfm" | "playlist";
	uri: string;
	header: string;
	subheader: string;
	imageUrl?: string;
	artistUri?: string;
	badge?: string | React.ReactElement;
	provider: "spotify" | "lastfm";
}

/**
 * renders a Spotify card component with contextual menu support
 * - for "lastfm" provider, the card opens external links instead of navigating within Spotify
 * - right-click triggers a context menu with type-specific actions (ArtistMenu, AlbumMenu, or PlaylistMenu)
 */
function SpotifyCard(props: SpotifyCardProps): React.ReactElement<HTMLDivElement> {
	// @ts-ignore
	const { Cards, TextComponent, ArtistMenu, AlbumMenu, PlaylistMenu, ContextMenu } = Spicetify.ReactComponent;
	const { FeatureCard: Card, CardImage } = Cards;
	const { type, header, uri, imageUrl, subheader, artistUri, badge, provider } = props;

	const Menu = () => {
		switch (type) {
			case "artist":
				return <ArtistMenu uri={uri} />;
			case "album":
				return <AlbumMenu uri={uri} artistUri={artistUri} canRemove={true} />;
			case "playlist":
				return <PlaylistMenu uri={uri} />;
			default:
				return <></>;
		}
	};

	let lastfmProps = {};

	if (provider === "lastfm") {
		lastfmProps = {
			onClick: () => window.open(uri, "_blank"),
			isPlayable: false,
			delegateNavigation: true,
		};
	};

	return (
		<ContextMenu menu={Menu()} trigger="right-click">
			<div style={{ position: "relative" }}>
				<Card
					featureIdentifier={type}
					headerText={header}
					renderCardImage={() => (
						<CardImage
							images={[
								{
									height: 640,
									url: imageUrl,
									width: 640,
								},
							]}
							isCircular={type === "artist"}
						/>
					)}
					renderSubHeaderContent={() => (
						<TextComponent as="div" variant="mesto" semanticColor="textSubdued">
							{subheader}
						</TextComponent>
					)}
					uri={uri}
					{...lastfmProps}
				/>
				{badge && <div className="badge">{badge}</div>}
			</div>
		</ContextMenu>
	);
}

export default SpotifyCard;
