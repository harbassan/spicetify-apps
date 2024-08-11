// @ts-ignore
import { v4 as uuidv4 } from "uuid";
import type { AlbumItem, GetContentsResponse } from "../types/platform";
import type { PlaylistResponse } from "@shared/types/platform";

export interface CollectionItem {
	type: "collection";
	name: string;
	uri: string;
	image?: string;
	addedAt: Date;
	lastPlayedAt: Date | null;
	items: string[];
	parentCollection: string;
	syncedPlaylistUri?: string;
}

export type CollectionChild = CollectionItem | AlbumItem;

type GetContentsProps = {
	collectionUri?: string;
	textFilter?: string;
	limit: number;
	offset: number;
};

class CollectionsWrapper extends EventTarget {
	_collections: CollectionItem[];

	constructor() {
		super();
		this._collections = JSON.parse(localStorage.getItem("library:collections") || "[]");
	}

	static INSTANCE = new CollectionsWrapper();

	saveCollections() {
		localStorage.setItem("library:collections", JSON.stringify(this._collections));
		this.dispatchEvent(new CustomEvent("update", { detail: this._collections }));
	}

	getCollection(uri: string) {
		return this._collections.find((collection) => collection.uri === uri);
	}

	async getCollectionContents(uri: string) {
		const collection = this.getCollection(uri);
		if (!collection) throw new Error("Collection not found");

		const items: CollectionChild[] = this._collections.filter((collection) => collection.parentCollection === uri);

		const albums = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["0"],
			offset: 0,
			limit: 9999,
		})) as GetContentsResponse<AlbumItem>;

		items.push(...albums.items.filter((album) => collection.items.includes(album.uri)));
		return items;
	}

	async getContents(props: GetContentsProps) {
		const { collectionUri, offset, limit, textFilter } = props;

		let items = collectionUri ? await this.getCollectionContents(collectionUri) : this._collections;
		const openedCollectionName = collectionUri ? this.getCollection(collectionUri)?.name : undefined;

		if (textFilter) {
			const regex = new RegExp(`\\b${textFilter}`, "i");
			items = items.filter((collection) => regex.test(collection.name));
		}

		items = items.slice(offset, offset + limit);

		return { items, totalLength: this._collections.length, offset, openedCollectionName };
	}

	async cleanCollections() {
		for (const collection of this._collections) {
			const boolArray = (await Spicetify.Platform.LibraryAPI.contains(...collection.items)) as boolean[];
			if (boolArray.includes(false)) {
				collection.items = collection.items.filter((_, i) => boolArray[i]);
				this.saveCollections();
				Spicetify.showNotification("Album removed from collection");
				this.syncCollection(collection.uri);
			}
		}
	}

	async syncCollection(uri: string) {
		const collection = this.getCollection(uri);
		if (!collection) return;

		const { PlaylistAPI } = Spicetify.Platform;

		if (!collection.syncedPlaylistUri) return;

		const playlist = (await PlaylistAPI.getPlaylist(collection.syncedPlaylistUri)) as PlaylistResponse;
		const playlistTracks = playlist.contents.items.filter((t) => t.type === "track").map((t) => t.uri);
		const collectionTracks = await this.getTracklist(uri);

		const wanted = collectionTracks.filter((track) => !playlistTracks.includes(track));
		const unwanted = playlistTracks
			.filter((track) => !collectionTracks.includes(track))
			.map((uri) => ({ uri, uid: [] }));

		if (wanted.length) await PlaylistAPI.add(collection.syncedPlaylistUri, wanted, { before: "end" });
		if (unwanted.length) await PlaylistAPI.remove(collection.syncedPlaylistUri, unwanted);
	}

	async getTracklist(collectionUri: string) {
		const collection = this.getCollection(collectionUri);
		if (!collection) return [];

		return Promise.all(
			collection.items.map(async (uri) => {
				const album = await Spicetify.Platform.LibraryAPI.getAlbum(uri);
				return album.items.map((t) => t.uri);
			}),
		).then((tracks) => tracks.flat());
	}

	async convertToPlaylist(uri: string) {
		const collection = this.getCollection(uri);
		if (!collection) return;

		const { Platform, showNotification } = Spicetify;
		const { RootlistAPI, PlaylistAPI } = Platform;

		if (collection.syncedPlaylistUri) {
			showNotification("Synced Playlist already exists", true);
			return;
		}

		try {
			const playlistUri = await RootlistAPI.createPlaylist(collection.name, { before: "start" });
			const items = await this.getTracklist(uri);
			await PlaylistAPI.add(playlistUri, items, { before: "start" });
			collection.syncedPlaylistUri = playlistUri;
		} catch (error) {
			console.error(error);
			showNotification("Failed to create playlist", true);
		}
	}

	createCollection(name: string, parentCollection = "") {
		this._collections.push({
			type: "collection" as CollectionItem["type"],
			uri: uuidv4(),
			name,
			items: [],
			addedAt: new Date(),
			lastPlayedAt: new Date(),
			parentCollection,
		});

		this.saveCollections();
		Spicetify.showNotification("Collection created");
	}

	deleteCollection(uri: string) {
		this._collections = this._collections.filter((collection) => collection.uri !== uri);

		this.saveCollections();
		Spicetify.showNotification("Collection deleted");
	}

	async addAlbumToCollection(collectionUri: string, albumUri: string) {
		const collection = this.getCollection(collectionUri);
		if (!collection) return;

		await Spicetify.Platform.LibraryAPI.add({ uris: [albumUri] });
		collection.items.push(albumUri);

		this.saveCollections();
		Spicetify.showNotification("Album added to collection");

		this.syncCollection(collectionUri);
	}

	removeAlbumFromCollection(collectionUri: string, albumUri: string) {
		const collection = this.getCollection(collectionUri);
		if (!collection) return;

		collection.items = collection.items.filter((item) => item !== albumUri);

		this.saveCollections();
		Spicetify.showNotification("Album removed from collection");

		this.syncCollection(collectionUri);
	}

	getCollectionsWithAlbum(albumUri: string) {
		return this._collections.filter((collection) => {
			return collection.items.some((item) => item === albumUri);
		});
	}

	renameCollection(uri: string, name: string) {
		const collection = this.getCollection(uri);
		if (!collection) return;

		collection.name = name;

		this.saveCollections();
		Spicetify.showNotification("Collection renamed");
	}

	setCollectionImage(uri: string, url: string) {
		const collection = this.getCollection(uri);
		if (!collection) return;

		collection.image = url;

		this.saveCollections();
		Spicetify.showNotification("Collection image set");
	}

	removeCollectionImage(uri: string) {
		const collection = this.getCollection(uri);
		if (!collection) return;

		collection.image = undefined;

		this.saveCollections();
		Spicetify.showNotification("Collection image removed");
	}
}

window.CollectionsWrapper = CollectionsWrapper.INSTANCE;

export default CollectionsWrapper;
