import { CollectionChild } from "../extensions/collections_wrapper";

function collectionSort(order: string, reverse: boolean) {
    const sortBy = (a: CollectionChild, b: CollectionChild) => {
        if (a.pinned || b.pinned) return 0;
        switch (order) {
            case "0":
                return a.name.replace(/^the\s+/i, '').localeCompare(b.name.replace(/^the\s+/i, ''));
            case "1":
                return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
            case "2":
                if (a.type === "collection") return -1;
                if (b.type === "collection") return 1;
                return a.artists[0].name.replace(/^the\s+/i, '').localeCompare(b.artists[0].name.replace(/^the\s+/i, ''));
            case "6":
                // @ts-ignore Date contructor does accept null as a parameter
                return new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
            default:
                return 0;
        }
    };

    return reverse ? (a: any, b: any) => sortBy(b, a) : sortBy;
}

export default collectionSort;