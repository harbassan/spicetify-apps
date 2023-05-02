(async () => {
    while (!Spicetify?.CosmosAsync) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
})();
