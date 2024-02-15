import CollectionMenu from "library/src/components/collection_menu";
import FolderMenu from "library/src/components/folder_menu";
import React from "react";

interface SpotifyCardProps {
    type: "artist" | "album" | "lastfm" | "playlist" | "folder" | "show" | "collection";
    uri: string;
    header: string;
    subheader: string;
    imageUrl: string;
}

function SpotifyCard(props: SpotifyCardProps): React.ReactElement<HTMLDivElement> {
    // @ts-ignore
    const { Cards, TextComponent, ArtistMenu, AlbumMenu, PodcastShowMenu, PlaylistMenu, ContextMenu } =
        Spicetify.ReactComponent;
    const { Default: Card, CardImage } = Cards;
    const { createHref, push } = Spicetify.Platform.History;
    const { type, header, uri, imageUrl, subheader } = props;

    const Menu = () => {
        switch (type) {
            case "artist":
                return <ArtistMenu uri={uri} />;
            case "album":
                return <AlbumMenu uri={uri} />;
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
        type === "lastfm"
            ? { onClick: () => window.open(uri, "_blank"), isPlayable: false, delegateNavigation: true }
            : {};

    const folderProps =
        type === "folder"
            ? {
                  delegateNavigation: true,
                  onClick: () => {
                      // send the user to the folder page
                      createHref({ pathname: `/library/folder/${uri}` });
                      push({ pathname: `/library/folder/${uri}` });
                  },
              }
            : {};

    const collectionProps =
        type === "collection"
            ? {
                  delegateNavigation: true,
                  onClick: () => {
                      createHref({ pathname: `/library/collection/${uri}` });
                      push({ pathname: `/library/collection/${uri}` });
                  },
              }
            : {};

    return (
        <ContextMenu menu={Menu()} trigger="right-click">
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
                    <TextComponent as="div" variant="mesto" semanticColor="textSubdued" children={subheader} />
                )}
                uri={uri}
                {...lastfmProps}
                {...folderProps}
                {...collectionProps}
            />
        </ContextMenu>
    );
}

export default SpotifyCard;
