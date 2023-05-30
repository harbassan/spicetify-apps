(async () => {
    while (!Spicetify?.CosmosAsync) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    Spicetify.LocalStorage.set("stats:cache-info", "0000");
})();
