import CollectionMenu from "library/src/components/collection_menu";
import FolderMenu from "library/src/components/folder_menu";
import React from "react";
import FolderSVG from "./folder_fallback";
import { useNavigation } from "library/src/components/nav_context";

interface SpotifyCardProps {
	type: "artist" | "album" | "lastfm" | "playlist" | "folder" | "show" | "collection" | "localalbum";
	uri: string;
	header: string;
	subheader: string;
	imageUrl?: string;
	artistUri?: string;
	badge?: string | React.ReactElement;
	provider: "spotify" | "lastfm";
}

function SpotifyCard(props: SpotifyCardProps): React.ReactElement<HTMLDivElement> {
	// @ts-ignore
	const { Cards, TextComponent, ArtistMenu, AlbumMenu, PodcastShowMenu, PlaylistMenu, ContextMenu } =
		Spicetify.ReactComponent;
	const { FeatureCard: Card, CardImage } = Cards;
	const { History } = Spicetify.Platform;
	const { navigate } = useNavigation() ?? {};
	const { type, header, uri, imageUrl, subheader, artistUri, badge, provider } = props;

	const Menu = () => {
		switch (type) {
			case "artist":
				return <ArtistMenu uri={uri} />;
			case "album":
				return <AlbumMenu uri={uri} artistUri={artistUri} canRemove={true} />;
			case "playlist":
				return <PlaylistMenu uri={uri} />;
			case "show":
				return <PodcastShowMenu uri={uri} />;
			case "collection":
				return <CollectionMenu id={uri} />;
			case "folder":
				return <FolderMenu uri={uri} />;
			default:
				return <></>;
		}
	};
	const lastfmProps =
		provider === "lastfm"
			? {
					onClick: () => window.open(uri, "_blank"),
					isPlayable: false,
					delegateNavigation: true,
				}
			: {};

	const folderProps =
		type === "folder"
			? {
					delegateNavigation: true,
					onClick: () => {
						navigate(`Playlists/${uri}`);
					},
				}
			: {};

	const collectionProps =
		type === "collection"
			? {
					delegateNavigation: true,
					onClick: () => {
						navigate(`Collections/${uri}`);
					},
				}
			: {};

	const localAlbumProps =
		type === "localalbum"
			? {
					delegateNavigation: true,
					onClick: () => {
						History.push({ pathname: "better-local-files/album", state: { uri } });
					},
				}
			: {};

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
							FallbackComponent={type === "folder" || type === "collection" ? FolderSVG : undefined}
						/>
					)}
					renderSubHeaderContent={() => (
						<TextComponent as="div" variant="mesto" semanticColor="textSubdued">
							{subheader}
						</TextComponent>
					)}
					uri={uri}
					{...lastfmProps}
					{...folderProps}
					{...collectionProps}
					{...localAlbumProps}
				/>
				{badge && <div className="badge">{badge}</div>}
			</div>
		</ContextMenu>
	);
}

export default SpotifyCard;
