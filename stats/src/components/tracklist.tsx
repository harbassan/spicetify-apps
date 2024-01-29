import React from "react";

const Tracklist = ({ minified = false, children }: any) => {
    return (
        <div
            role="grid"
            aria-rowcount={minified ? 5 : 50}
            aria-colcount={4}
            className="main-trackList-trackList main-trackList-indexable"
            tabIndex={0}
        >
            {!minified && (
                <div className="main-trackList-trackListHeader" role="presentation">
                    <div
                        className="main-trackList-trackListHeaderRow main-trackList-trackListRowGrid"
                        role="row"
                        aria-rowindex={1}
                    >
                        <div
                            className="main-trackList-rowSectionIndex"
                            role="columnheader"
                            aria-colindex={1}
                            aria-sort="none"
                            tabIndex={-1}
                        >
                            #
                        </div>
                        <div
                            className="main-trackList-rowSectionStart"
                            role="columnheader"
                            aria-colindex={2}
                            aria-sort="none"
                            tabIndex={-1}
                        >
                            <button className="main-trackList-column main-trackList-sortable" tabIndex={-1}>
                                <span
                                    className="TypeElement-mesto-type standalone-ellipsis-one-line"
                                    data-encore-id="type"
                                >
                                    Title
                                </span>
                            </button>
                        </div>
                        <div
                            className="main-trackList-rowSectionVariable"
                            role="columnheader"
                            aria-colindex={3}
                            aria-sort="none"
                            tabIndex={-1}
                        >
                            <button className="main-trackList-column main-trackList-sortable" tabIndex={-1}>
                                <span
                                    className="TypeElement-mesto-type standalone-ellipsis-one-line"
                                    data-encore-id="type"
                                >
                                    Album
                                </span>
                            </button>
                        </div>
                        <div
                            className="main-trackList-rowSectionEnd"
                            role="columnheader"
                            aria-colindex={5}
                            aria-sort="none"
                            tabIndex={-1}
                        >
                            <Spicetify.ReactComponent.TooltipWrapper label={"Duration"} placement="top">
                                <button
                                    aria-label="Duration"
                                    className="main-trackList-column main-trackList-durationHeader main-trackList-sortable"
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
                                        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path>
                                        <path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path>
                                    </svg>
                                </button>
                            </Spicetify.ReactComponent.TooltipWrapper>
                        </div>
                    </div>
                </div>
            )}
            <div className="main-rootlist-wrapper" role="presentation" style={{ height: (minified ? 5 : 50) * 56 }}>
                <div role="presentation">{children}</div>
            </div>
        </div>
    );
};

export default Tracklist;
