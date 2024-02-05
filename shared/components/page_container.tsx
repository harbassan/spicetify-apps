import React from "react";

import CreatePlaylistButton from "../../stats/src/components/buttons/create_playlist_button";
import { InfoToCreatePlaylist } from "../../stats/src/types/stats_types";

interface PageContainerProps {
    title: string;
    infoToCreatePlaylist?: InfoToCreatePlaylist;
    headerEls?: React.ReactElement | React.ReactElement[];
    children: React.ReactElement | React.ReactElement[];
}

const PageContainer = (props: PageContainerProps) => {
    const { title, infoToCreatePlaylist, headerEls, children } = props;
    const { TextComponent } = Spicetify.ReactComponent;
    return (
        <section className="contentSpacing">
            <div className={"page-header"}>
                <div className="header-left">
                    <TextComponent children={title} as="h1" variant="canon" semanticColor="textBase" />
                    {infoToCreatePlaylist ? <CreatePlaylistButton infoToCreatePlaylist={infoToCreatePlaylist} /> : null}
                </div>
                <div className="header-right">{headerEls}</div>
            </div>
            <div className={"page-content"}>{children}</div>
        </section>
    );
};

export default PageContainer;
