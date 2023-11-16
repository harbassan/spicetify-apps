import React from "react";

const Status = (props: { heading: string; subheading: string }) => {
    return (
        <>
            <div className="stats-loadingWrapper">
                <svg role="img" height="46" width="46" aria-hidden="true" viewBox="0 0 24 24" data-encore-id="icon" className="Svg-img-24 Svg-img-24-icon">
                    <path d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V21a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V3a1 1 0 0 1 .5-.866zM16 4.732V20h4V7.041l-4-2.309zM3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zm6 0a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1z"></path>
                </svg>
                <h1>{props.heading}</h1>
                <h2>{props.subheading}</h2>
            </div>
        </>
    );
};

export default Status;