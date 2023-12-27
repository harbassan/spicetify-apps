import React from "react";

import RefreshButton from "./buttons/refresh_button";
import SettingsButton from "./buttons/settings_button";
import CreatePlaylistButton from "./buttons/create_playlist_button";
import { ConfigWrapper, InfoToCreatePlaylist } from "../types/stats_types";

interface PageHeaderProps {
    title: string;
    refreshCallback: () => void;
    config: ConfigWrapper;
    dropdown: React.ReactElement;
    infoToCreatePlaylist?: InfoToCreatePlaylist;
    children: any;
}

const PageHeader = ({ title, refreshCallback, config, dropdown, infoToCreatePlaylist, children }: PageHeaderProps) => {
    return (
        <section className="contentSpacing">
            <div className={"stats-header"}>
                <div className="stats-header-left">
                    <Spicetify.ReactComponent.TextComponent
                        children={title}
                        as="h1"
                        variant="canon"
                        semanticColor="textBase"
                    ></Spicetify.ReactComponent.TextComponent>
                    {infoToCreatePlaylist ? <CreatePlaylistButton infoToCreatePlaylist={infoToCreatePlaylist} /> : null}
                </div>
                <div className="stats-header-right">
                    <RefreshButton callback={refreshCallback} />
                    <SettingsButton config={config} />
                    {dropdown}
                </div>
            </div>
            <div>{children}</div>
        </section>
    );
};

export default React.memo(PageHeader);
