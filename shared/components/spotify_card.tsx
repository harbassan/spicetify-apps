import React from "react";

interface SpotifyCardProps {
    type: "artist" | "album" | "lastfm";
    uri: string;
    header: string;
    subheader: string;
    imageUrl: string;
}

function SpotifyCard(props: SpotifyCardProps): React.ReactElement<HTMLDivElement> {
    // @ts-ignore
    const { Cards, TextComponent, ArtistMenu, AlbumMenu, ContextMenu } = Spicetify.ReactComponent;
    const { Default: Card, CardImage } = Cards;
    const { type, header, uri, imageUrl, subheader } = props;

    const Menu = () => {
        switch (type) {
            case "artist":
                return <ArtistMenu uri={uri} />;
            case "album":
                return <AlbumMenu uri={uri} />;
            default:
                return <></>;
        }
    };
    const lastfmProps =
        type === "lastfm"
            ? { onClick: () => window.open(uri, "_blank"), isPlayable: false, delegateNavigation: true }
            : {};

    return (
        <ContextMenu menu={<Menu />} trigger="right-click">
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
            />
        </ContextMenu>
    );
}

export default SpotifyCard;
