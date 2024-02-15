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

interface RootlistItemProps {
    type: "folder" | "playlist";
    uri: string;
    name: string;
    owner: { name: string };
    images: { url: string }[];
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

const AddMenu = ({ folder }: { folder?: string }) => {
    const { MenuItem, Menu } = Spicetify.ReactComponent;
    const { RootlistAPI } = Spicetify.Platform;
    const { SVGIcons } = Spicetify;

    const insertLocation = folder ? { uri: folder } : "start";

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
    const [sortDropdown, sortOption] = useDropdownMenu(dropdownOptions, "library:playlists-sort");
    const [filterDropdown, filterOption, setFilterOption, setAvailableOptions] = useDropdownMenu(filterOptions);
    const [textFilter, setTextFilter] = React.useState("");
    const [images, setImages] = React.useState({ ...SpicetifyLibrary.FolderImageWrapper.getFolderImages() });

    const { useInfiniteQuery } = Spicetify.ReactQuery;
    const limit = 200;

    const fetchRootlist = async ({ pageParam }: { pageParam: number }) => {
        const filters = filterOption.id === "all" ? ["2"] : ["2", filterOption.id];
        const res = await Spicetify.Platform.LibraryAPI.getContents({
            filters,
            sortOrder: sortOption.id,
            folderUri: folder,
            textFilter,
            offset: pageParam,
            limit,
        });
        return res;
    };

    const { data, status, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
        queryKey: ["library:playlists", sortOption.id, filterOption.id, textFilter, folder],
        queryFn: fetchRootlist,
        initialPageParam: 0,
        getNextPageParam: (lastPage: any, _allPages: any, lastPageParam: number) => {
            return lastPage.totalLength > lastPageParam + limit ? lastPageParam + limit : undefined;
        },
    });

    React.useEffect(() => {
        const onUpdate = (e: any) => refetch();
        const onImageUpdate = (e: any) => setImages({ ...e.detail });

        Spicetify.Platform.RootlistAPI.getEvents().addListener("update", onUpdate);
        SpicetifyLibrary.FolderImageWrapper.addEventListener("update", onImageUpdate);

        return () => {
            Spicetify.Platform.RootlistAPI.getEvents().removeListener("update", onUpdate);
            SpicetifyLibrary.FolderImageWrapper.removeEventListener("update", onImageUpdate);
        };
    }, []);

    const props = {
        title: data?.pages[0].openedFolderName || "Playlists",
        headerEls: [
            <AddButton Menu={<AddMenu folder={folder} />} />,
            sortDropdown,
            filterDropdown,
            <SearchBar setSearch={setTextFilter} placeholder="Playlists" />,
            <SettingsButton configWrapper={configWrapper} />,
        ],
    };

    if (status === "pending") {
        return (
            <PageContainer {...props}>
                <Status icon="library" heading="Loading" subheading="Fetching your playlists" />
            </PageContainer>
        );
    } else if (status === "error") {
        return (
            <PageContainer {...props}>
                <Status icon="error" heading="Error" subheading="Failed to load your playlists" />
            </PageContainer>
        );
    } else if (!data.pages[0].items.length) {
        return (
            <PageContainer {...props}>
                <Status icon="library" heading="Nothing Here" subheading="You don't have any playlists saved" />
            </PageContainer>
        );
    }

    const rootlistItems = data.pages.map((page: any) => page.items).flat() as RootlistItemProps[];

    const rootlistCards = rootlistItems.map((playlist) => {
        return (
            <SpotifyCard
                type={playlist.type}
                uri={playlist.uri}
                header={playlist.name}
                subheader={playlist.owner?.name || "Folder"}
                imageUrl={playlist.images?.[0]?.url || images[playlist.uri] || ""}
            />
        );
    });

    if (hasNextPage) rootlistCards.push(<LoadMoreCard callback={fetchNextPage} />);

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{rootlistCards}</div>
        </PageContainer>
    );
};

export default PlaylistsPage;
