import React from "react";

interface TrackArtistProps {
    uri: string;
    id: string;
    name: string;
    [key: string]: any;
}

interface TrackRowProps {
    uri: string;
    id: string;
    name: string;
    explicit: boolean;
    duration_ms: number;
    artists: TrackArtistProps[];
    album: TrackAlbumProps;
    index: number;
    liked?: boolean;
    [key: string]: any;
}

interface TrackAlbumProps {
    uri: string;
    id: string;
    name: string;
    images: any[];
    [key: string]: any;
}

function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(1, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const ArtistLink = (props: TrackArtistProps) => {
    return (
        <>
            <a draggable="true" dir="auto" href={props.uri} tabIndex={-1}>
                {props.name}
            </a>
            {props.index === props.length ? null : ", "}
        </>
    );
};

const ExplicitBadge = React.memo(() => {
    return (
        <>
            <span className="Type__TypeElement-sc-goli3j-0 TypeElement-ballad-textSubdued-type main-trackList-rowBadges" data-encore-id="type">
                <span aria-label="Explicit" className="main-tag-container" title="Explicit">
                    E
                </span>
            </span>
        </>
    );
});

const LikedIcon = ({ active, id }: { active: boolean; id: string }) => {
    const [liked, setLiked] = React.useState<boolean>(active);

    const toggleLike = () => {
        if (liked) {
            Spicetify.CosmosAsync.del("https://api.spotify.com/v1/me/tracks?ids=" + id);
            Spicetify.showNotification("Removed from your Liked Songs");
        } else {
            Spicetify.CosmosAsync.put("https://api.spotify.com/v1/me/tracks?ids=" + id);
            Spicetify.showNotification("Added to your Liked Songs");
        }

        setLiked(!liked);
    };

    React.useEffect(() => {
        setLiked(active);
    }, [active]);

    return (
        <button
            type="button"
            role="switch"
            aria-checked={liked}
            aria-label="Remove from Your Library"
            onClick={toggleLike}
            className={
                liked ? "main-addButton-button main-trackList-rowHeartButton main-addButton-active" : "main-addButton-button main-trackList-rowHeartButton"
            }
            tabIndex={-1}
        >
            <svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" className="Svg-sc-ytk21e-0 Svg-img-16-icon">
                <path
                    d={
                        liked
                            ? "M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z"
                            : "M1.69 2A4.582 4.582 0 0 1 8 2.023 4.583 4.583 0 0 1 11.88.817h.002a4.618 4.618 0 0 1 3.782 3.65v.003a4.543 4.543 0 0 1-1.011 3.84L9.35 14.629a1.765 1.765 0 0 1-2.093.464 1.762 1.762 0 0 1-.605-.463L1.348 8.309A4.582 4.582 0 0 1 1.689 2zm3.158.252A3.082 3.082 0 0 0 2.49 7.337l.005.005L7.8 13.664a.264.264 0 0 0 .311.069.262.262 0 0 0 .09-.069l5.312-6.33a3.043 3.043 0 0 0 .68-2.573 3.118 3.118 0 0 0-2.551-2.463 3.079 3.079 0 0 0-2.612.816l-.007.007a1.501 1.501 0 0 1-2.045 0l-.009-.008a3.082 3.082 0 0 0-2.121-.861z"
                    }
                />
            </svg>
        </button>
    );
};

const TrackRow = (props: TrackRowProps) => {
    const ArtistLinks = props.artists.map((artist, index) => {
        return <ArtistLink index={index} length={props.artists.length - 1} {...artist} />;
    });

    return (
        <>
            <div role="row" aria-rowindex={2} aria-selected="false">
                <div className="main-trackList-trackListRow main-trackList-trackListRowGrid" draggable="true" role="presentation">
                    <div className="main-trackList-rowSectionIndex" role="gridcell" aria-colindex={1} tabIndex={-1}>
                        <div className="main-trackList-rowMarker">
                            <span className="Type__TypeElement-sc-goli3j-0 TypeElement-ballad-type main-trackList-number" data-encore-id="type">
                                {props.index + 1}
                            </span>
                            <button
                                className="main-trackList-rowImagePlayButton"
                                aria-label="Play Odd Ways by MIKE, Wiki, The Alchemist"
                                tabIndex={-1}
                                onClick={() => Spicetify.Player.playUri(props.uri)}
                            >
                                <svg
                                    role="img"
                                    height="24"
                                    width="24"
                                    aria-hidden="true"
                                    className="Svg-sc-ytk21e-0 Svg-img-24-icon main-trackList-rowPlayPauseIcon"
                                    viewBox="0 0 24 24"
                                    data-encore-id="icon"
                                >
                                    <path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="main-trackList-rowSectionStart" role="gridcell" aria-colindex={2} tabIndex={-1}>
                        <img
                            aria-hidden="false"
                            draggable="false"
                            loading="eager"
                            src={props.album.images[2].url}
                            alt=""
                            className="main-image-image main-trackList-rowImage main-image-loaded"
                            width="40"
                            height="40"
                        />
                        <div className="main-trackList-rowMainContent">
                            <div
                                dir="auto"
                                className="Type__TypeElement-sc-goli3j-0 TypeElement-ballad-textBase-type main-trackList-rowTitle standalone-ellipsis-one-line"
                                data-encore-id="type"
                            >
                                {props.name}
                            </div>
                            {props.explicit && <ExplicitBadge />}
                            <span
                                className="Type__TypeElement-sc-goli3j-0 TypeElement-mesto-textSubdued-type main-trackList-rowSubTitle standalone-ellipsis-one-line"
                                data-encore-id="type"
                            >
                                {ArtistLinks}
                            </span>
                        </div>
                    </div>
                    <div className="main-trackList-rowSectionVariable" role="gridcell" aria-colindex={3} tabIndex={-1}>
                        <span data-encore-id="type" className="Type__TypeElement-sc-goli3j-0 TypeElement-mesto-type">
                            <a draggable="true" className="standalone-ellipsis-one-line" dir="auto" href={props.album.uri} tabIndex={-1}>
                                {props.album.name}
                            </a>
                        </span>
                    </div>
                    <div className="main-trackList-rowSectionEnd" role="gridcell" aria-colindex={5} tabIndex={-1}>
                        {props.liked ? <LikedIcon active={props.liked} id={props.id} /> : ""}
                        <div className="Type__TypeElement-sc-goli3j-0 TypeElement-mesto-textSubdued-type main-trackList-rowDuration" data-encore-id="type">
                            {formatDuration(props.duration_ms)}
                        </div>
                        <button
                            type="button"
                            aria-haspopup="menu"
                            aria-label="More options for Odd Ways by MIKE, Wiki, The Alchemist"
                            className="main-moreButton-button main-trackList-rowMoreButton"
                            tabIndex={-1}
                        >
                            <svg
                                role="img"
                                height="16"
                                width="16"
                                aria-hidden="true"
                                viewBox="0 0 16 16"
                                data-encore-id="icon"
                                className="Svg-sc-ytk21e-0 Svg-img-16-icon"
                            >
                                <path d="M3 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm6.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM16 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(TrackRow);
