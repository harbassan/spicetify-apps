// @ts-ignore
import { v4 as uuidv4 } from "uuid";
import type { AlbumItem, GetContentsResponse } from "../types/platform";

export interface CollectionItem {
	type: "collection";
	name: string;
	uri: string;
	image?: string;
	addedAt: Date;
	lastPlayedAt: Date | null;
	items: string[];
	parentCollection: string;
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

		collection.items.push(albumUri);

		this.saveCollections();
		Spicetify.showNotification("Album added to collection");
	}

	removeAlbumFromCollection(collectionUri: string, albumUri: string) {
		const collection = this.getCollection(collectionUri);
		if (!collection) return;

		collection.items = collection.items.filter((item) => item !== albumUri);

		this.saveCollections();
		Spicetify.showNotification("Album removed from collection");
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

export default CollectionsWrapper.INSTANCE;
