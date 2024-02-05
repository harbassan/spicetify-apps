import React from "react";

const collapseLibrary = () => {
    Spicetify.Platform.LocalStorageAPI.setItem("ylx-sidebar-state", 1);
};

const CollapseIcon = () => {
    const { IconComponent } = Spicetify.ReactComponent;

    return (
        <IconComponent
            semanticColor="textSubdued"
            dangerouslySetInnerHTML={{
                __html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8.81 1A.749.749 0 0 0 7.53.47L0 7.99l7.53 7.521a.75.75 0 0 0 1.234-.815.75.75 0 0 0-.174-.243L2.87 8.74h12.38a.75.75 0 1 0 0-1.498H2.87l5.72-5.713c.14-.14.22-.331.22-.53z"></path></svg>',
            }}
            iconSize="16"
        />
    );
};

const CollapseButton = () => {
    const { ButtonTertiary } = Spicetify.ReactComponent;

    return <ButtonTertiary buttonSize="sm" aria-label="Show Filters" iconOnly={CollapseIcon} onClick={collapseLibrary} />;
};

export default CollapseButton;
