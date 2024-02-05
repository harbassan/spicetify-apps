import React from "react";

interface AddButtonProps {
    folderUri: string;
}

function AddIcon(): React.ReactElement<SVGElement> {
    return (
        <Spicetify.ReactComponent.IconComponent
            semanticColor="textSubdued"
            dangerouslySetInnerHTML={{
                __html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75z"></path></svg>',
            }}
            iconSize="16"
        />
    );
}

const LeadingIcon = ({ icon }: { icon: string }) => {
    return (
        <Spicetify.ReactComponent.IconComponent
            semanticColor="textSubdued"
            dangerouslySetInnerHTML={{
                __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${icon}</svg>`,
            }}
            iconSize="16"
        />
    );
};

function AddButton(props: AddButtonProps): React.ReactElement<HTMLButtonElement> {
    const { SVGIcons, ReactComponent, Platform } = Spicetify;
    const { TooltipWrapper, ButtonTertiary, ContextMenu, Menu, MenuItem } = ReactComponent;
    const { RootlistAPI } = Platform;
    const { folderUri } = props;

    const insertLocation = folderUri === "start" ? folderUri : { uri: folderUri };
    const createFolder = () => RootlistAPI.createFolder("New Folder", { after: insertLocation });
    const createPlaylist = () => RootlistAPI.createPlaylist("New Playlist", { after: insertLocation });

    const AddMenu = () => {
        return (
            <Menu>
                <MenuItem onClick={createFolder} leadingIcon={<LeadingIcon icon={SVGIcons["playlist-folder"]} />}>
                    Create Folder
                </MenuItem>
                <MenuItem onClick={createPlaylist} leadingIcon={<LeadingIcon icon={SVGIcons["playlist"]} />}>
                    Create Playlist
                </MenuItem>
            </Menu>
        );
    };

    return (
        <TooltipWrapper label={"Add"} placement="top">
            <span>
                <ContextMenu trigger="click" menu={<AddMenu />}>
                    <ButtonTertiary buttonSize="sm" aria-label="Add" iconOnly={AddIcon} />
                </ContextMenu>
            </span>
        </TooltipWrapper>
    );
}

export default AddButton;
