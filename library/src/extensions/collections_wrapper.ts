// @ts-ignore
import { v4 as uuidv4 } from "uuid";

interface Collection {
    type: string;
    name: string;
    id: string;
    items: CollectionItem[];
}

interface Album {
    type: string;
    name: string;
    uri: string;
    image: string;
    artist: string;
}

type CollectionItem = Album;

class CollectionWrapper {
    collections: Collection[];

    constructor() {
        let storedCollections = JSON.parse(localStorage.getItem("library:collections") || "[]");
        this.collections = storedCollections;
    }

    saveCollections() {
        localStorage.setItem("library:collections", JSON.stringify(this.collections));
    }

    getCollections() {
        return this.collections;
    }

    getCollection(id: string) {
        return this.collections.find((collection) => collection.id === id);
    }

    createCollection(name: string) {
        const id = uuidv4();
        const collection: Collection = {
            type: "collection",
            id,
            name,
            items: [],
        };
        this.collections.push(collection);
        this.saveCollections();
    }

    deleteCollection(id: string) {
        this.collections = this.collections.filter((collection) => collection.id !== id);
        this.saveCollections();
    }

    async addAlbumToCollection(collectionId: string, albumUri: string) {
        const collection = this.collections.find((collection) => collection.id === collectionId);
        if (!collection) return;

        const res = await Spicetify.GraphQL.Request(Spicetify.GraphQL.Definitions.getAlbum, {
            uri: albumUri,
            locale: "en",
            offset: 0,
            limit: 50,
        });

        const data = res.data.albumUnion;
        const album = {
            type: "album",
            name: data.name,
            uri: data.uri,
            image: data.coverArt?.sources?.[0].url,
            artist: data.artists.items[0].profile.name,
        };

        collection.items.push(album);
        this.saveCollections();
    }

    removeAlbumFromCollection(collectionId: string, albumUri: string) {
        const collection = this.collections.find((collection) => collection.id === collectionId);
        if (!collection) return;

        collection.items = collection.items.filter((item) => item?.uri !== albumUri);
        this.saveCollections();
    }

    getCollectionsWithAlbum(albumUri: string) {
        return this.collections.filter((collection) => {
            return collection.items.some((item) => item?.uri === albumUri);
        });
    }

    renameCollection(collectionId: string, newName: string) {
        const collection = this.collections.find((collection) => collection.id === collectionId);
        if (!collection) return;

        collection.name = newName;
        this.saveCollections();
    }
}

export default CollectionWrapper;
