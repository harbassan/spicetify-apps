import React from "react";

import CollectionMenu from "./collection_menu";
import FolderMenu from "./folder_menu";
import FolderSVG from "./folder_fallback";
import LocalAlbumMenu from "./local_album_menu";

interface CustomCardProps {
	type: "folder" | "show" | "collection" | "localalbum";
	uri: string;
	header: string;
	subheader: string;
	imageUrl?: string;
	badge?: string | React.ReactElement;
}

function CustomCard(props: CustomCardProps): React.ReactElement<HTMLDivElement> {
	// @ts-ignore
	const { Cards, TextComponent, PodcastShowMenu, ContextMenu } = Spicetify.ReactComponent;
	const { FeatureCard: Card, CardImage } = Cards;
	const { History } = Spicetify.Platform;
	const { type, header, uri, imageUrl, subheader, badge } = props;

	const Menu = () => {
		switch (type) {
			case "show":
				return <PodcastShowMenu uri={uri} />;
			case "collection":
				return <CollectionMenu id={uri} />;
			case "folder":
				return <FolderMenu uri={uri} />;
			case "localalbum":
				return <LocalAlbumMenu id={uri} />;
			default:
				return <></>;
		}
	};


	const additionalProps = (() => {
		switch (type) {
			case "folder":
				return {
					delegateNavigation: true,
					onClick: () => {
						Spicetify.Platform.History.replace(`/library/Playlists/${uri}`);
						Spicetify.LocalStorage.set("library:active-link", `Playlists/${uri}`);
					},
				}
			case "collection":
				return {
					delegateNavigation: true,
					onClick: () => {
						Spicetify.Platform.History.replace(`/library/Collections/${uri}`);
						Spicetify.LocalStorage.set("library:active-link", `Collections/${uri}`);
					},
				}
			case "localalbum":
				return {
					delegateNavigation: true,
					onClick: () => {
						History.push({ pathname: "better-local-files/album", state: { uri } });
					},
				}
		}
	})()

	const isCollection = type === "collection" || type === "folder";

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
							FallbackComponent={isCollection ? FolderSVG : undefined}
						/>
					)}
					renderSubHeaderContent={() => (
						<TextComponent as="div" variant="mesto" semanticColor="textSubdued">
							{subheader}
						</TextComponent>
					)}
					uri={uri}
					{...additionalProps}
				/>
				{badge && <div className="badge">{badge}</div>}
			</div>
		</ContextMenu>
	);
}

export default CustomCard;
