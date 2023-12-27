import React from "react";

import { InfoToCreatePlaylist } from "../../types/stats_types";

async function createPlaylistAsync(infoToCreatePlaylist: InfoToCreatePlaylist): Promise<void> {
    try {
        const { RootlistAPI, PlaylistAPI } = Spicetify.Platform;
        const { playlistName, itemsUris } = infoToCreatePlaylist;
        const playlistUri = await RootlistAPI.createPlaylist(playlistName, { before: 'start' });
        await PlaylistAPI.add(playlistUri, itemsUris, { before: 'start' });
    } catch (error) {
        console.error(error);
        Spicetify.showNotification("Failed to create playlist", true, 1000);
    }
};

function CreatePlaylistButton({ infoToCreatePlaylist }: { infoToCreatePlaylist: InfoToCreatePlaylist }): React.ReactElement<HTMLButtonElement> {
    const { TooltipWrapper, ButtonSecondary } = Spicetify.ReactComponent;
    return (
        <TooltipWrapper label={"Turn Into Playlist"} renderInline={true} placement="top">
            <ButtonSecondary
                aria-label="Turn Into Playlist"
                children="Turn Into Playlist"
                semanticColor="textBase"
                buttonSize="sm"
                onClick={() => createPlaylistAsync(infoToCreatePlaylist)}
                className="stats-make-playlist-button"
            ></ButtonSecondary>
        </TooltipWrapper>
    );
};

export default CreatePlaylistButton;
