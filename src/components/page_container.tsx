import React from "react";

import RefreshButton from "./buttons/refresh_button";
import SettingsButton from "./buttons/settings_button";
import CreatePlaylistButton from "./buttons/create_playlist_button";
import { ConfigWrapper, InfoToCreatePlaylist } from "../types/stats_types";

interface PageContainerProps {
    title: string;
    refreshCallback: () => void;
    config: ConfigWrapper;
    dropdown: React.ReactElement;
    infoToCreatePlaylist?: InfoToCreatePlaylist;
    children: React.ReactElement | React.ReactElement[];
}

function PageContainer(props: PageContainerProps) {
    const { TextComponent } = Spicetify.ReactComponent;
    const { title, refreshCallback, config, dropdown, infoToCreatePlaylist, children } = props;
    
    return (
        <section className="contentSpacing">
            <div className={"stats-header"}>
                <div className="stats-header-left">
                    <TextComponent
                        children={title}
                        as="h1"
                        variant="canon"
                        semanticColor="textBase"
                    />
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

export default React.memo(PageContainer);
