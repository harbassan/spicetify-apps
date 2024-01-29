import React from "react";

import { InfoToCreatePlaylist } from "../../types/stats_types";

interface CreatePlaylistButtonProps {
    infoToCreatePlaylist: InfoToCreatePlaylist;
}

async function createPlaylistAsync(infoToCreatePlaylist: InfoToCreatePlaylist): Promise<void> {
    const { Platform, showNotification } = Spicetify;
    const { RootlistAPI, PlaylistAPI } = Platform;

    try {
        const { playlistName, itemsUris } = infoToCreatePlaylist;
        const playlistUri = await RootlistAPI.createPlaylist(playlistName, { before: "start" });
        await PlaylistAPI.add(playlistUri, itemsUris, { before: "start" });
    } catch (error) {
        console.error(error);
        showNotification("Failed to create playlist", true, 1000);
    }
}

function CreatePlaylistButton(props: CreatePlaylistButtonProps): React.ReactElement<HTMLButtonElement> {
    const { TooltipWrapper, ButtonSecondary } = Spicetify.ReactComponent;
    const { infoToCreatePlaylist } = props;

    return (
        <TooltipWrapper label={"Turn Into Playlist"} renderInline={true} placement="top">
            <ButtonSecondary
                aria-label="Turn Into Playlist"
                children="Turn Into Playlist"
                semanticColor="textBase"
                buttonSize="sm"
                onClick={() => createPlaylistAsync(infoToCreatePlaylist)}
                className="stats-make-playlist-button"
            />
        </TooltipWrapper>
    );
}

export default CreatePlaylistButton;
