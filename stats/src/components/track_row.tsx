import React from "react";
import { queue } from "../funcs";
import { Track } from "../types/stats_types";

interface TrackRowProps extends Track {
    index: number;
    uris: string[];
}

const ArtistLink = ({ name, uri, index, length }: { name: string; uri: string; index: number; length: number }) => {
    return (
        <>
            <a draggable="true" dir="auto" href={uri} tabIndex={-1}>
                {name}
            </a>
            {index === length ? null : ", "}
        </>
    );
};

const ExplicitBadge = React.memo(() => {
    return (
        <>
            <span className="TypeElement-ballad-textSubdued-type main-trackList-rowBadges" data-encore-id="type">
                <span aria-label="Explicit" className="main-tag-container" title="Explicit">
                    E
                </span>
            </span>
        </>
    );
});

const LikedIcon = ({ active, uri }: { active: boolean; uri: string }) => {
    const [liked, setLiked] = React.useState<boolean>(active);

    const toggleLike = () => {
        if (liked) {
            Spicetify.Platform.LibraryAPI.remove(uri);
        } else {
            Spicetify.Platform.LibraryAPI.add(uri);
        }
        setLiked(!liked);
    };

    React.useEffect(() => {
        setLiked(active);
    }, [active]);

    return (
        <Spicetify.ReactComponent.TooltipWrapper
            label={liked ? `Remove from Your Library` : "Save to Your Library"}
            placement="top"
        >
            <button
                type="button"
                role="switch"
                aria-checked={liked}
                aria-label="Remove from Your Library"
                onClick={toggleLike}
                className={
                    liked
                        ? "main-addButton-button main-trackList-rowHeartButton main-addButton-active"
                        : "main-addButton-button main-trackList-rowHeartButton"
                }
                tabIndex={-1}
            >
                <svg
                    role="img"
                    height="16"
                    width="16"
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    data-encore-id="icon"
                    className="Svg-img-16 Svg-img-16-icon Svg-img-icon Svg-img-icon-small"
                >
                    <path
                        d={
                            liked
                                ? "M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z"
                                : "M1.69 2A4.582 4.582 0 0 1 8 2.023 4.583 4.583 0 0 1 11.88.817h.002a4.618 4.618 0 0 1 3.782 3.65v.003a4.543 4.543 0 0 1-1.011 3.84L9.35 14.629a1.765 1.765 0 0 1-2.093.464 1.762 1.762 0 0 1-.605-.463L1.348 8.309A4.582 4.582 0 0 1 1.689 2zm3.158.252A3.082 3.082 0 0 0 2.49 7.337l.005.005L7.8 13.664a.264.264 0 0 0 .311.069.262.262 0 0 0 .09-.069l5.312-6.33a3.043 3.043 0 0 0 .68-2.573 3.118 3.118 0 0 0-2.551-2.463 3.079 3.079 0 0 0-2.612.816l-.007.007a1.501 1.501 0 0 1-2.045 0l-.009-.008a3.082 3.082 0 0 0-2.121-.861z"
                        }
                    />
                </svg>
            </button>
        </Spicetify.ReactComponent.TooltipWrapper>
    );
};

const DraggableComponent = ({
    uri,
    title,
    ...props
}: { uri: string; title: string } & React.HTMLProps<HTMLDivElement>) => {
    const dragHandler = Spicetify.ReactHook.DragHandler?.([uri], title);
    return (
        <div onDragStart={dragHandler} draggable="true" {...props}>
            {props.children}
        </div>
    );
};

interface AlbumMenuProps extends Spicetify.ReactComponent.MenuProps {
    uri: string;
    onRemoveCallback?: (uri: string) => void;
}

function playAndQueue(uri: string, uris: string[]) {
    uris = uris.filter((u) => !u.includes("last"));
    uris = uris.concat(uris.splice(0, uris.indexOf(uri)));
    queue(uris);
}

const MenuWrapper = React.memo((props: AlbumMenuProps) => <Spicetify.ReactComponent.AlbumMenu {...props} />);

const TrackRow = (props: TrackRowProps) => {
    const ArtistLinks = props.artists.map((artist, index) => {
        return <ArtistLink index={index} length={props.artists.length - 1} name={artist.name} uri={artist.uri} />;
    });

    return (
        <>
            <Spicetify.ReactComponent.ContextMenu menu={<MenuWrapper uri={props.uri} />} trigger="right-click">
                <div role="row" aria-rowindex={2} aria-selected="false">
                    <DraggableComponent
                        uri={props.uri}
                        title={`${props.name} • ${props.artists.map((artist) => artist.name).join(", ")}`}
                        className="main-trackList-trackListRow main-trackList-trackListRowGrid"
                        role="presentation"
                        onClick={(event) => event.detail === 2 && playAndQueue(props.uri, props.uris)}
                        style={{ height: 56 }}
                    >
                        <div className="main-trackList-rowSectionIndex" role="gridcell" aria-colindex={1} tabIndex={-1}>
                            {/* @ts-ignore - needs uri prop to work with playlist-labels extension*/}
                            <div uri={props.uri} className="main-trackList-rowMarker">
                                <span className="TypeElement-ballad-type main-trackList-number" data-encore-id="type">
                                    {props.index}
                                </span>
                                <Spicetify.ReactComponent.TooltipWrapper
                                    label={`Play ${props.name} by ${props.artists
                                        .map((artist) => artist.name)
                                        .join(", ")}`}
                                    placement="top"
                                >
                                    <button
                                        className="main-trackList-rowImagePlayButton"
                                        aria-label={`Play ${props.name}`}
                                        tabIndex={-1}
                                        onClick={() => playAndQueue(props.uri, props.uris)}
                                    >
                                        <svg
                                            role="img"
                                            height="24"
                                            width="24"
                                            aria-hidden="true"
                                            className="Svg-img-24 Svg-img-24-icon main-trackList-rowPlayPauseIcon"
                                            viewBox="0 0 24 24"
                                            data-encore-id="icon"
                                        >
                                            <path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"></path>
                                        </svg>
                                    </button>
                                </Spicetify.ReactComponent.TooltipWrapper>
                            </div>
                        </div>
                        <div className="main-trackList-rowSectionStart" role="gridcell" aria-colindex={2} tabIndex={-1}>
                            <img
                                aria-hidden="false"
                                draggable="false"
                                loading="eager"
                                src={props.image}
                                alt=""
                                className="main-image-image main-trackList-rowImage main-image-loaded"
                                width="40"
                                height="40"
                            />
                            <div className="main-trackList-rowMainContent">
                                <div
                                    dir="auto"
                                    className="TypeElement-ballad-textBase TypeElement-ballad-textBase-type main-trackList-rowTitle standalone-ellipsis-one-line"
                                    data-encore-id="type"
                                >
                                    {props.name}
                                </div>
                                {props.explicit && <ExplicitBadge />}
                                <span
                                    className="TypeElement-mesto-textSubdued TypeElement-mesto-textSubdued-type main-trackList-rowSubTitle standalone-ellipsis-one-line"
                                    data-encore-id="type"
                                >
                                    {ArtistLinks}
                                </span>
                            </div>
                        </div>
                        <div
                            className="main-trackList-rowSectionVariable"
                            role="gridcell"
                            aria-colindex={3}
                            tabIndex={-1}
                        >
                            <span data-encore-id="type" className="TypeElement-mesto TypeElement-mesto-type">
                                <a
                                    draggable="true"
                                    className="standalone-ellipsis-one-line"
                                    dir="auto"
                                    href={props.album_uri}
                                    tabIndex={-1}
                                >
                                    {props.album}
                                </a>
                            </span>
                        </div>
                        <div className="main-trackList-rowSectionEnd" role="gridcell" aria-colindex={5} tabIndex={-1}>
                            {<LikedIcon active={props.liked || false} uri={props.uri} />}
                            <div
                                className="TypeElement-mesto-textSubdued TypeElement-mesto-textSubdued-type main-trackList-rowDuration"
                                data-encore-id="type"
                            >
                                {Spicetify.Player.formatTime(props.duration)}
                            </div>

                            <Spicetify.ReactComponent.ContextMenu
                                menu={<MenuWrapper uri={props.uri} />}
                                trigger="click"
                            >
                                <button
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-label={`More options for ${props.name}`}
                                    className="main-moreButton-button Button-sm-16-buttonTertiary-iconOnly-condensed-useBrowserDefaultFocusStyle Button-small-small-buttonTertiary-iconOnly-condensed-useBrowserDefaultFocusStyle main-trackList-rowMoreButton"
                                    tabIndex={-1}
                                >
                                    <Spicetify.ReactComponent.TooltipWrapper
                                        label={`More options for ${props.name} by ${props.artists
                                            .map((artist) => artist.name)
                                            .join(", ")}`}
                                        placement="top"
                                    >
                                        <span>
                                            <svg
                                                role="img"
                                                height="16"
                                                width="16"
                                                aria-hidden="true"
                                                viewBox="0 0 16 16"
                                                data-encore-id="icon"
                                                className="Svg-img-16 Svg-img-16-icon Svg-img-icon Svg-img-icon-small"
                                            >
                                                <path d="M3 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm6.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM16 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"></path>
                                            </svg>
                                        </span>
                                    </Spicetify.ReactComponent.TooltipWrapper>
                                </button>
                            </Spicetify.ReactComponent.ContextMenu>
                        </div>
                    </DraggableComponent>
                </div>
            </Spicetify.ReactComponent.ContextMenu>
        </>
    );
};

export default React.memo(TrackRow);
