import React from "react";

interface SpotifyCardProps {
    type: "artist" | "album" | "lastfm";
    name: string;
    uri: string;
    imageUrl: string;
    subtext: string;
};

const { Cards, TextComponent, ArtistMenu, AlbumMenu, ContextMenu } = Spicetify.ReactComponent;

function SpotifyCard(props: SpotifyCardProps): React.ReactElement<HTMLDivElement> {
    const { type, name, uri, imageUrl, subtext } = props;
    const { Default: Card, CardImage } = Cards;
    const Menu = () => {
        switch (type) {
            case "artist":
                return <ArtistMenu uri={uri} />
            case "album":
                return <AlbumMenu uri={uri} />
            default:
                return <></>;
        }
    }
    const lastfmProps = type === "lastfm" ? { onClick: () => window.open(uri, "_blank"), isPlayable: false, delegateNavigation: true } : {};

    return (
        <ContextMenu menu={<Menu />} trigger="right-click">
            <Card
                featureIdentifier={type}
                headerText={name}
                renderCardImage={
                    () =>
                        <CardImage
                            images={[{
                                height: 640,
                                url: imageUrl,
                                width: 640
                            }]}
                        />
                }
                renderSubHeaderContent={
                    () =>
                        <TextComponent
                            as="div"
                            variant="mesto"
                            semanticColor="textSubdued"
                            children={subtext}
                        />
                }
                uri={uri}
                {...lastfmProps}
            />
        </ContextMenu>
    );
};

export default SpotifyCard;
