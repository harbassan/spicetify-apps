import { CollectionChild } from "../extensions/collections_wrapper";

function collectionSort(order: string, reverse: boolean): (a: CollectionChild, b: CollectionChild) => number {
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
            case "3":
                // Release Year — server already sorts standard albums; local albums lack
                // release year metadata, so sort them to the end alphabetically.
                if (a.type === "collection" || b.type === "collection") return 0;
                {
                    const aLocal = a.type === "localalbum" ? 1 : 0;
                    const bLocal = b.type === "localalbum" ? 1 : 0;
                    if (aLocal !== bLocal) return aLocal - bLocal;
                    if (aLocal && bLocal) {
                        const nameCompare = a.name.replace(/^the\s+/i, '').localeCompare(b.name.replace(/^the\s+/i, ''));
                        return reverse ? -nameCompare : nameCompare;
                    }
                }
                return 0; // Both standard — preserve server order
            case "6":
                // @ts-ignore Date contructor does accept null as a parameter
                return new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
            default:
                return 0;
        }
    };

    // For case "3" (Release Year), the server handles sort direction and local albums
    // must always sort to the end — skip the global reverse wrapper for that case.
    return reverse && order !== "3" ? (a: CollectionChild, b: CollectionChild) => sortBy(b, a) : sortBy;
}

export default collectionSort;