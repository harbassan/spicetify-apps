import React from "react";
import RefreshButton from "./buttons/refresh_button";
import SettingsButton from "./buttons/settings_button";

interface PageHeaderProps {
    title: string;
    callback: () => void;
    config: any;
    dropdown: any;
    createPlaylist?: () => void;
    children: any;
}

const PageHeader = ({ title, callback, config, dropdown, createPlaylist, children }: PageHeaderProps) => {
    const createPlaylistButton = createPlaylist && (
        <button className="stats-createPlaylistButton" data-encore-id="buttonSecondary" aria-expanded="false" onClick={createPlaylist}>
            {"Turn Into Playlist"}
        </button>
    );
    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="TypeElement-canon-type">
                        {title}
                        {createPlaylistButton ? createPlaylistButton : null}
                    </h1>
                    <div className="collection-searchBar-searchBar">
                        <RefreshButton refreshCallback={callback} />
                        <SettingsButton config={config} />
                        {dropdown}
                    </div>
                </div>
                <div>{children}</div>
            </section>
        </>
    );
};

export default React.memo(PageHeader);
