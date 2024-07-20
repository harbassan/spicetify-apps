import type { PlaylistResponse, RootlistResponse } from "../types/platform";

export const getFullPlaylist = async (uri: string) => {
	const playlist = (await Spicetify.Platform.PlaylistAPI.getPlaylist(uri)) as PlaylistResponse;
	const tracks = playlist.contents.items;
	return tracks;
};

export const getRootlist = async () => {
	const rootlist = (await Spicetify.Platform.RootlistAPI.getContents({ flatten: true })) as RootlistResponse;
	return rootlist.items;
};
