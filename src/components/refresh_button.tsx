import React from "react";

const RefreshButton = ({ refreshCallback }: { refreshCallback: any }) => {
    return (
        <div className="x-filterBox-filterInputContainer stats-refreshButton" role="search" aria-expanded="false">
            <Spicetify.ReactComponent.TooltipWrapper label={"Refresh"} renderInline={true} placement="bottom">
                <button className="x-filterBox-expandButton" aria-hidden="false" aria-label="Search in playlists" onClick={() => refreshCallback()}>
                    <svg
                        role="img"
                        height="16"
                        width="16"
                        aria-hidden="true"
                        className="Svg-img-16 Svg-img-16-icon Svg-img-icon Svg-img-icon-small x-filterBox-searchIcon"
                        viewBox="0 0 16 16"
                        data-encore-id="icon"
                    >
                        <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path>
                    </svg>
                </button>
            </Spicetify.ReactComponent.TooltipWrapper>
        </div>
    );
};

export default RefreshButton;
