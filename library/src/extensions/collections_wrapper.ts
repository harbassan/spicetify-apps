// @ts-ignore
import { v4 as uuidv4 } from "uuid";

interface Collection {
    type: string;
    name: string;
    uri: string;
    items: CollectionItem[];
    totalLength: number;
}

interface Album {
    type: string;
    name: string;
    uri: string;
    artists: { name: string }[];
    images: { url: string }[];
}

type CollectionItem = Album | Collection;

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

    getCollection(uri: string) {
        return this.collections.find((collection) => collection.uri === uri);
    }

    createCollection(name: string) {
        const uri = uuidv4();
        const collection: Collection = {
            type: "collection",
            uri,
            name,
            items: [],
            totalLength: 0,
        };
        this.collections.push(collection);
        this.saveCollections();
    }

    deleteCollection(uri: string) {
        this.collections = this.collections.filter((collection) => collection.uri !== uri);
        this.saveCollections();
    }

    async addAlbumToCollection(collectionUri: string, albumUri: string) {
        const collection = this.collections.find((collection) => collection.uri === collectionUri);
        if (!collection) return;

        const res = await Spicetify.GraphQL.Request(Spicetify.GraphQL.Definitions.getAlbum, {
            uri: albumUri,
            locale: "en",
            offset: 0,
            limit: 1,
        });

        const data = res.data.albumUnion;
        const album = {
            type: "album",
            name: data.name,
            uri: data.uri,
            images: [{ url: data.coverArt?.sources?.[0].url }],
            artists: [{ name: data.artists.items[0].profile.name }],
        };

        collection.items.push(album);
        collection.totalLength++;
        this.saveCollections();
    }

    removeAlbumFromCollection(collectionUri: string, albumUri: string) {
        const collection = this.collections.find((collection) => collection.uri === collectionUri);
        if (!collection) return;

        collection.items = collection.items.filter((item) => item?.uri !== albumUri);
        collection.totalLength--;
        this.saveCollections();
    }

    getCollectionsWithAlbum(albumUri: string) {
        return this.collections.filter((collection) => {
            return collection.items.some((item) => item?.uri === albumUri);
        });
    }

    renameCollection(uri: string, newName: string) {
        const collection = this.collections.find((collection) => collection.uri === uri);
        if (!collection) return;

        collection.name = newName;
        this.saveCollections();
    }
}

export default CollectionWrapper;
