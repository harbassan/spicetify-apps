class FolderImageWrapper extends EventTarget {
	_folderImages: Record<string, string>;

	constructor() {
		super();
		this._folderImages = JSON.parse(localStorage.getItem("library:folderImages") || "{}");
	}

	static INSTANCE = new FolderImageWrapper();

	getFolderImage(uri: string) {
		return this._folderImages[uri];
	}

	getFolderImages() {
		return this._folderImages;
	}

	setFolderImage({ uri, url }: { uri: string; url: string }) {
		this._folderImages[uri] = url;

		this.saveFolderImages();
		Spicetify.showNotification("Folder image updated");
	}

	removeFolderImage(uri: string) {
		delete this._folderImages[uri];

		this.saveFolderImages();
		Spicetify.showNotification("Folder image removed");
	}

	saveFolderImages() {
		this.dispatchEvent(new CustomEvent("update", { detail: this._folderImages }));
		localStorage.setItem("library:folderImages", JSON.stringify(this._folderImages));
	}
}

window.FolderImageWrapper = FolderImageWrapper.INSTANCE;

export default FolderImageWrapper;
