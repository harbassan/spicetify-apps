import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import PageContainer from "@shared/components/page_container";
import SpotifyCard from "@shared/components/spotify_card";
import SettingsButton from "@shared/components/settings_button";
import type { ConfigWrapper } from "../types/library_types";
import LoadMoreCard from "../components/load_more_card";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import useStatus from "@shared/status/useStatus";
import { useInfiniteQuery } from "@shared/types/react_query";
import type { AlbumItem, ArtistItem, GetContentsResponse, UpdateEvent } from "../types/platform";
import PinIcon from "../components/pin_icon";
import useSortDropdownMenu from "@shared/dropdown/useSortDropdownMenu";
import CustomCard from "../components/custom_card";

const getAddMenuItems = () => {
	const addArtist = () => {
		const onSave = (value: string) => {
			Spicetify.Platform.LibraryAPI.add({ uris: [value] });
		};

		Spicetify.PopupModal.display({
			title: "Add Artist",
			// @ts-ignore
			content: <TextInputDialog def={""} placeholder="Artist URI" onSave={onSave} />,
		});
	};

	return [
		{ label: "Add Artist", iconPath: Spicetify.SVGIcons.artist, onClick: addArtist },
	];
};

function isValidArtist(artist: ArtistItem) {
	return artist.name && artist.uri;
}

const limit = 200;
const artistAlbumScanPageLimit = 5;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
];

const ArtistAlbums = ({
	artist,
	onBack,
	configWrapper,
}: { artist: ArtistItem; onBack: () => void; configWrapper: ConfigWrapper }) => {
	const [albums, setAlbums] = React.useState<AlbumItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [scannedItemCount, setScannedItemCount] = React.useState<number | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		const fetchAlbums = async () => {
			setLoading(true);
			setScannedItemCount(null);
			try {
				let allItems: AlbumItem[] = [];
				let offset = 0;
				let total = Infinity;
				let scannedPages = 0;

				while (!cancelled && offset < total && scannedPages < artistAlbumScanPageLimit) {
					const res = (await Spicetify.Platform.LibraryAPI.getContents({
						filters: ["0"],
						sortOrder: "0",
						textFilter: artist.name,
						offset,
						limit,
					})) as GetContentsResponse<AlbumItem>;

					const pageItems = res.items || [];
					allItems = allItems.concat(pageItems);

					total = res.totalLength;

					scannedPages += 1;
					offset += pageItems.length;
					if (pageItems.length === 0) break;
				}

				const hitScanCap = scannedPages === artistAlbumScanPageLimit && offset < total;

				// Filter to only albums by this specific artist
				const normalizedArtistName = artist.name?.trim().toLowerCase();
				const artistAlbums = allItems.filter((album) =>
					album.artists?.some((a) => {
						// Prefer exact URI match when available
						if (artist.uri && a.uri) {
							return a.uri === artist.uri;
						}
						// Fallback: match by normalized name when URIs are missing
						const albumArtistName = a.name?.trim().toLowerCase();
						return (
							normalizedArtistName !== undefined &&
							albumArtistName !== undefined &&
							albumArtistName === normalizedArtistName
						);
					}),
				);
				if (!cancelled) {
					setAlbums(artistAlbums);
					setScannedItemCount(hitScanCap ? offset : null);
				}
			} catch (e) {
				console.error("Failed to fetch artist albums", e);
				if (!cancelled) {
					setAlbums([]);
					setScannedItemCount(null);
				}
			}
			if (!cancelled) setLoading(false);
		};
		fetchAlbums();
		return () => { cancelled = true; };
	}, [artist.uri, artist.name]);

	const albumCards = albums.map((album) => (
		album.type === "album" ? (
			<SpotifyCard
				key={album.uri}
				type="album"
				uri={album.uri}
				header={album.name}
				subheader={album.artists?.[0]?.name || ""}
				imageUrl={album.images?.[0]?.url}
				badge={album.pinned ? <PinIcon /> : undefined}
			/>
		) : (
			<CustomCard
				key={album.uri}
				type="localalbum"
				uri={album.uri}
				header={album.name}
				subheader={album.artists?.[0]?.name || ""}
				imageUrl={album.images?.[0]?.url}
				badge={album.pinned ? <PinIcon /> : undefined}
			/>
		)
	));

	return (
		<PageContainer
			lhs={[
				<button type="button" className="library-backButton" onClick={onBack} aria-label="Back to artists">
					<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
						<path d="M15.957 2.793a1 1 0 0 1 0 1.414L8.164 12l7.793 7.793a1 1 0 1 1-1.414 1.414L5.336 12l9.207-9.207a1 1 0 0 1 1.414 0z" />
					</svg>
				</button>,
				artist.name,
			]}
			rhs={[<SettingsButton configWrapper={configWrapper} />]}
		>
			{loading ? (
				<div className="library-item-count">Loading albums...</div>
			) : albums.length === 0 ? (
				<div className="library-item-count">
					{scannedItemCount !== null
						? `No saved albums found in the first ${scannedItemCount} matching library items.`
						: "No saved albums found for this artist"}
				</div>
			) : (
				<>
					{scannedItemCount !== null ? (
						<div className="library-item-count">
							Showing albums from the first {scannedItemCount} matching library items to avoid long load times.
						</div>
					) : null}
					{configWrapper.config["show-item-count"] ? (
						<div className="library-item-count">{albums.length} albums</div>
					) : null}
					<div className="main-gridContainer-gridContainer grid">{albumCards}</div>
				</>
			)}
		</PageContainer>
	);
};

const ArtistsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [sortDropdown, sortOption, isReversed] = useSortDropdownMenu(sortOptions, "library:artists");
	const [textFilter, setTextFilter] = React.useState("");
	const [selectedArtist, setSelectedArtist] = React.useState<ArtistItem | null>(null);

	const fetchArtists = async ({ pageParam }: { pageParam: number }) => {
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["1"],
			sortOrder: sortOption.id,
			textFilter,
			offset: pageParam,
			sortDirection: isReversed ? "reverse" : undefined,
			limit,
		})) as GetContentsResponse<ArtistItem>;
		if (!res.items?.length) throw new Error("No artists found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:artists", sortOption.id, isReversed, textFilter],
		queryFn: fetchArtists,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
		},
	});

	useEffect(() => {
		const update = (e: UpdateEvent) => {
			if (e.data.list === "artists") refetch();
		};
		Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", update, {});
		return () => {
			Spicetify.Platform.LibraryAPI.getEvents()._emitter.removeListener("update", update);
		};
	}, [refetch]);

	const Status = useStatus(status, error);

	const props = {
		lhs: ["Artists"],
		rhs: [
			<AddButton menuItems={getAddMenuItems()} />,
			sortDropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Artists" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	if (selectedArtist) {
		return (
			<ArtistAlbums
				artist={selectedArtist}
				onBack={() => setSelectedArtist(null)}
				configWrapper={configWrapper}
			/>
		);
	}

	const contents = data as NonNullable<typeof data>;

	const artists = contents.pages.flatMap((page) => page.items);

	const validArtists = artists.filter(isValidArtist);

	const artistCards = validArtists.map((artist) => {
		if (configWrapper.config["artist-album-view"]) {
			return (
				<CustomCard
					key={artist.uri}
					type="artist"
					uri={artist.uri}
					header={artist.name}
					subheader={""}
					imageUrl={artist.images?.at(0)?.url}
					badge={artist.pinned ? <PinIcon /> : undefined}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setSelectedArtist(artist);
					}}
				/>
			);
		}

		return (
			<SpotifyCard
				key={artist.uri}
				type="artist"
				uri={artist.uri}
				header={artist.name}
				subheader={""}
				imageUrl={artist.images?.at(0)?.url}
				badge={artist.pinned ? <PinIcon /> : undefined}
			/>
		);
	});

	if (hasNextPage) artistCards.push(<LoadMoreCard key="load-more" callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			{configWrapper.config["show-item-count"] ? (
				<div className="library-item-count">{validArtists.length} artists</div>
			) : null}
			<div className={"main-gridContainer-gridContainer grid"}>{artistCards}</div>
		</PageContainer>
	);
};

export default ArtistsPage;
