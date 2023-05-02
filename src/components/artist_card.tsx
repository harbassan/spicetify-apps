import React from "react";

type cardProps = {
    name: string;
    image: string;
    uri: string;
    subtext: string;
};

interface ArtistMenuProps extends Spicetify.ReactComponent.MenuProps {
    uri: string;
    onRemoveCallback?: (uri: string) => void;
}

const MenuWrapper = React.memo((props: ArtistMenuProps) => <Spicetify.ReactComponent.ArtistMenu {...props} />);

const Card = ({ name, image, uri, subtext }: cardProps) => {
    const goToArtist = (uriString: string) => {
        const uriObj = Spicetify.URI.fromString(uriString);
        const url = uriObj.toURLPath(true);
        Spicetify.Platform.History.push(url);
        Spicetify.Platform.History.goForward();
    };

    return (
        <>
            <Spicetify.ReactComponent.ContextMenu menu={<MenuWrapper uri={uri} />} trigger="right-click">
                <div className="main-card-card" onClick={() => goToArtist(uri)}>
                    <div draggable="true" className="main-card-draggable">
                        <div className="main-card-imageContainer">
                            <div className="main-cardImage-imageWrapper main-cardImage-circular">
                                <div className="">
                                    <img
                                        aria-hidden="false"
                                        draggable="false"
                                        loading="lazy"
                                        src={image}
                                        className="main-image-image main-cardImage-image main-cardImage-circular main-image-loaded"
                                    />
                                </div>
                            </div>
                            <div className="main-card-PlayButtonContainer">
                                <div className="main-playButton-PlayButton">
                                    <button data-encore-id="buttonPrimary" className="Button-sc-qlcn5g-0 Button-md-buttonPrimary-useBrowserDefaultFocusStyle">
                                        <span className="ButtonInner-sc-14ud5tc-0 ButtonInner-md-iconOnly encore-bright-accent-set">
                                            <span aria-hidden="true" className="IconWrapper__Wrapper-sc-1hf1hjl-0 Wrapper-md-24-only">
                                                <svg
                                                    role="img"
                                                    height="24"
                                                    width="24"
                                                    aria-hidden="true"
                                                    viewBox="0 0 24 24"
                                                    data-encore-id="icon"
                                                    className="Svg-sc-ytk21e-0 Svg-img-24-icon"
                                                >
                                                    <path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"></path>
                                                </svg>
                                            </span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="main-card-cardMetadata">
                            <a draggable="false" className="main-cardHeader-link" dir="auto">
                                <div
                                    className="Type__TypeElement-sc-goli3j-0 TypeElement-balladBold-textBase-4px-type main-cardHeader-text"
                                    data-encore-id="type"
                                >
                                    {name}
                                </div>
                            </a>
                            <div className="Type__TypeElement-sc-goli3j-0 TypeElement-mesto-textSubdued-type main-cardSubHeader-root" data-encore-id="type">
                                <span>{subtext}</span>
                            </div>
                        </div>
                        <div className="main-card-cardLink"></div>
                    </div>
                </div>
            </Spicetify.ReactComponent.ContextMenu>
        </>
    );
};

export default React.memo(Card);
