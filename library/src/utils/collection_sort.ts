import { CollectionChild } from "../extensions/collections_wrapper";

function collectionSort(order: string, reverse: boolean) {
    const sortBy = (a: CollectionChild, b: CollectionChild) => {
        switch (order) {
            case "0":
                return a.name.localeCompare(b.name);
            case "1":
                return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
            case "2":
                if (a.type === "collection") {
                    return -1;
                } else if (b.type === "collection") {
                    return 1;
                }
                return a.artists[0].name.localeCompare(b.artists[0].name);
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