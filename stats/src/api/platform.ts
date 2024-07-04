import type { PlaylistResponse } from "../types/platform";

export const getFullPlaylist = async (uri: string) => {
	const playlist = (await Spicetify.Platform.PlaylistAPI.getPlaylist(uri)) as PlaylistResponse;
	const tracks = playlist.contents.items;
	return tracks;
};
