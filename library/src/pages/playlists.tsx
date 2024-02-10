import React from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/components/status";
import SpotifyCard from "@shared/components/spotify_card";
import SettingsButton from "@shared/components/settings_button";
import AddButton from "../components/add_button";
import { ConfigWrapperProps } from "../types/library_types";
import LoadMoreCard from "../components/load_more_card";
import TextInputDialog from "../components/text_input_dialog";
import LeadingIcon from "../components/leading_icon";

interface PlaylistProps {
    uri: string;
    name: string;
    owner: { name: string };
    images: { url: string }[];
    type: "folder" | "playlist";
}

interface PlaylistPageProps {
    folder: string | null;
    items: PlaylistProps[] | 100 | 200 | 300;
}

const dropdownOptions = [
    { id: "0", name: "Name" },
    { id: "1", name: "Date Added" },
    { id: "2", name: "Creator" },
    { id: "4", name: "Custom Order" },
    { id: "6", name: "Recents" },
];

const filterOptions = [
    { id: "all", name: "All" },
    { id: "100", name: "Downloaded" },
    { id: "102", name: "By You" },
    { id: "103", name: "By Spotify" },
];

const AddMenu = ({ folderUri }: { folderUri: string }) => {
    const { MenuItem, Menu } = Spicetify.ReactComponent;
    const { RootlistAPI } = Spicetify.Platform;
    const { SVGIcons } = Spicetify;

    const insertLocation = folderUri === "start" ? folderUri : { uri: folderUri };

    const createFolder = () => {
        const onSave = (value: string) => {
            RootlistAPI.createFolder(value || "New Folder", { after: insertLocation });
        };

        Spicetify.PopupModal.display({
            title: "Create Folder",
            // @ts-ignore
            content: <TextInputDialog def={"New Folder"} placeholder="Folder Name" onSave={onSave} />,
        });
    };

    const createPlaylist = () => {
        const onSave = (value: string) => {
            RootlistAPI.createPlaylist(value || "New Playlist", { after: insertLocation });
        };

        Spicetify.PopupModal.display({
            title: "Create Playlist",
            // @ts-ignore
            content: <TextInputDialog def={"New Playlist"} placeholder="Playlist Name" onSave={onSave} />,
        });
    };

    return (
        <Menu>
            <MenuItem onClick={createFolder} leadingIcon={<LeadingIcon path={SVGIcons["playlist-folder"]} />}>
                Create Folder
            </MenuItem>
            <MenuItem onClick={createPlaylist} leadingIcon={<LeadingIcon path={SVGIcons["playlist"]} />}>
                Create Playlist
            </MenuItem>
        </Menu>
    );
};

const PlaylistsPage = ({ folder, configWrapper }: { configWrapper: ConfigWrapperProps; folder?: string }) => {
    console.log("playlists mount");
    const [playlists, setPlaylists] = React.useState<PlaylistPageProps>({ folder: null, items: 100 });
    const [sortDropdown, sortOption] = useDropdownMenu(dropdownOptions, "library:playlists-sort");
    const [filterDropdown, filterOption, setFilterOption, setAvailableOptions] = useDropdownMenu(filterOptions);
    const [textFilter, setTextFilter] = React.useState("");

    // force a re-render when the rootlist is updated
    const [trigger, setTrigger] = React.useState(false);

    Spicetify.Platform.RootlistAPI.getEvents().addListener("update", () => {
        setTrigger(!trigger);
    });

    const firstUpdate = React.useRef(true);

    React.useEffect(() => {
        // run only on subsequent updates after mount
        if (firstUpdate.current) {
            firstUpdate.current = false;
            return;
        }

        const filters = filterOption.id === "all" ? ["2"] : ["2", filterOption.id];
        Spicetify.Platform.LibraryAPI.getContents({
            filters,
            sortOrder: sortOption.id,
            folderUri: folder,
            textFilter,
            offset: 0,
            limit: 100,
        }).then((res: any) => {
            const items = res.items.length ? res.items : textFilter ? 300 : 200;
            setPlaylists({ folder: res.openedFolderName, items });
        });
    }, [sortOption, filterOption, trigger, textFilter]);

    // fetch playlists and available sort/filter options on mount
    React.useEffect(() => {
        const filters = filterOption.id === "all" ? ["2"] : ["2", filterOption.id];
        Spicetify.Platform.LibraryAPI.getContents({
            filters,
            sortOrder: sortOption.id,
            folderUri: folder,
            offset: 0,
            limit: 100,
        }).then((res: any) => {
            const { availableFilters } = res;
            availableFilters.unshift(filterOptions[0]);
            setAvailableOptions(availableFilters);
            const items = res.items.length ? res.items : textFilter ? 300 : 200;
            setPlaylists({ folder: res.openedFolderName, items });
        });
    }, [folder]);

    const title = playlists.folder || "Playlists";
    const folderUri = folder || "start";

    const props = {
        title,
        folderUri,
        headerEls: [
            <AddButton Menu={AddMenu} />,
            sortDropdown,
            filterDropdown,
            <SearchBar setSearch={setTextFilter} placeholder="Playlists" />,
            <SettingsButton configWrapper={configWrapper} />,
        ],
    };

    switch (playlists.items) {
        case 100:
            return <></>;
        case 200:
            return (
                <PageContainer title={title}>
                    <Status icon="library" heading="Nothing Here" subheading="There are no playlists in this folder" />
                </PageContainer>
            );
        case 300:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Nothing Here" subheading="No playlists match your search" />
                </PageContainer>
            );
    }

    const playlistCards = playlists.items.map((playlist) => {
        return (
            <SpotifyCard
                type={playlist.type}
                uri={playlist.uri}
                header={playlist.name}
                subheader={playlist.owner?.name || "Folder"}
                imageUrl={playlist.images?.[0]?.url || ""}
            />
        );
    });

    if (playlists.items.length % 100 === 0) {
        const playlistItems = playlists.items as PlaylistProps[];
        playlistCards.push(
            <LoadMoreCard
                callback={() => {
                    Spicetify.Platform.LibraryAPI.getContents({
                        filters: ["2"],
                        sortOrder: sortOption.id,
                        folderUri: folder,
                        textFilter,
                        offset: playlistItems.length,
                        limit: 100,
                    }).then((res: any) => {
                        setPlaylists({ folder: res.openedFolderName, items: [...playlistItems, ...res.items] });
                    });
                }}
            />
        );
    }

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{playlistCards}</div>
        </PageContainer>
    );
};

export default PlaylistsPage;
