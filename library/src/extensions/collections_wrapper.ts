// @ts-ignore
import { v4 as uuidv4 } from "uuid";

type Collections = {
    type: string;
    name: string;
    uri: string;
    items: string[];
    totalLength: number;
    parentCollection: string;
}[];

class CollectionWrapper extends EventTarget {
    _collections: Collections;

    constructor() {
        super();
        this._collections = JSON.parse(localStorage.getItem("library:collections") || "[]");
    }

    saveCollections() {
        localStorage.setItem("library:collections", JSON.stringify(this._collections));
        this.dispatchEvent(new CustomEvent("update", { detail: this._collections }));
    }

    getCollection(uri: string) {
        return this._collections.find((collection) => collection.uri === uri) as Collections[0];
    }

    async requestAlbums({ sortOrder, textFilter }: { sortOrder?: string; textFilter?: string }) {
        const albums = await Spicetify.Platform.LibraryAPI.getContents({
            filters: ["0"],
            sortOrder,
            textFilter,
            offset: 0,
            limit: 9999,
        });
        return albums;
    }

    async getCollectionItems(props: {
        collectionUri?: string;
        textFilter?: string;
        sortOrder?: string;
        rootlist?: boolean;
        limit?: number;
        offset?: number;
    }) {
        const { collectionUri, textFilter, sortOrder, rootlist, limit = 9999, offset = 0 } = props;

        let collectionItems = this._collections;
        let albumItems = [];
        let unfilteredLength = this._collections.length;
        let openedCollection = "";

        if (collectionUri) {
            const collection = this.getCollection(collectionUri);

            // filter out any albums not in the collection
            const res = await this.requestAlbums({ sortOrder, textFilter });
            const collectionSet = new Set(collection.items);
            const commonElements = res.items.filter((item: any) => collectionSet.has(item.uri));
            const collections = this._collections.filter((collection) => collection.parentCollection === collectionUri);

            openedCollection = collection.name;
            collectionItems = collections;
            albumItems = commonElements;
            unfilteredLength = collection.totalLength;
        }

        if (textFilter) {
            let regex = new RegExp("\\b" + textFilter, "i");
            collectionItems = collectionItems.filter((item) => {
                return regex.test(item.name);
            });
        }

        if (rootlist && !collectionUri) {
            const res = await this.requestAlbums({ sortOrder, textFilter });
            albumItems = res.items;

            if (!textFilter) {
                const collectionSet = new Set(this._collections.map((collection) => collection.items).flat());
                const uncommonElements = res.items.filter((item: any) => !collectionSet.has(item.uri));

                collectionItems = this._collections.filter((collection) => !collection.parentCollection);
                albumItems = uncommonElements;

                unfilteredLength = this._collections.length + uncommonElements.length;
            }
        }

        if (offset > 0) collectionItems = [];

        return {
            openedCollection,
            items: [...collectionItems, ...albumItems.slice(offset, offset + limit)],
            totalLength: albumItems.length + collectionItems.length,
            unfilteredLength: unfilteredLength,
        };
    }

    createCollection(name: string, parentCollection: string = "") {
        const uri = uuidv4();
        const collection = {
            type: "collection",
            uri,
            name,
            items: [],
            totalLength: 0,
            parentCollection,
        };
        this._collections.push(collection);

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
        collection.totalLength++;

        this.saveCollections();
        Spicetify.showNotification("Album added to collection");
    }

    removeAlbumFromCollection(collectionUri: string, albumUri: string) {
        const collection = this.getCollection(collectionUri);
        if (!collection) return;

        collection.items = collection.items.filter((item) => item !== albumUri);
        collection.totalLength--;

        this.saveCollections();
        Spicetify.showNotification("Album removed from collection");
    }

    getCollectionsWithAlbum(albumUri: string) {
        return this._collections.filter((collection) => {
            return collection.items.some((item) => item === albumUri);
        });
    }

    renameCollection(uri: string, newName: string) {
        const collection = this.getCollection(uri);
        if (!collection) return;

        collection.name = newName;

        this.saveCollections();
        Spicetify.showNotification("Collection renamed");
    }
}

export default CollectionWrapper;
