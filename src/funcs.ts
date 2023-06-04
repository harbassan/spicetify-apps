export const updatePageCache = (i: any, callback: Function, activeOption: string, lib = false) => {
    let cacheInfo = Spicetify.LocalStorage.get("stats:cache-info");
    if (!cacheInfo) return;

    let cacheInfoArray = JSON.parse(cacheInfo);
    if (!cacheInfoArray[i]) {
        if (!lib) {
            ["short_term", "medium_term", "long_term"].filter(option => option !== activeOption).forEach(option => callback(option, true, false));
        }
        callback(activeOption, true);
        cacheInfoArray[i] = true;
        Spicetify.LocalStorage.set("stats:cache-info", JSON.stringify(cacheInfoArray));
    }
};

export const apiRequest = async (name: string, url: string, timeout = 10) => {
    let response;
    try {
        let timeStart = window.performance.now();
        response = await Spicetify.CosmosAsync.get(url);
        console.log("stats -", name, "fetch time:", window.performance.now() - timeStart);
    } catch (e) {
        console.error("stats -", name, "request failed:", e);
        console.log(url);
        if (timeout > 0) setTimeout(() => apiRequest(name, url, --timeout), 5000);
    }
    return response;
};
