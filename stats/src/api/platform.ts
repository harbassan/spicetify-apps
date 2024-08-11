import type { getAlbumResponse } from "../types/graph_ql";
import type { PlaylistResponse, RootlistResponse } from "../../../shared/types/platform";

export const getFullPlaylist = async (uri: string) => {
	const playlist = (await Spicetify.Platform.PlaylistAPI.getPlaylist(uri)) as PlaylistResponse;
	const tracks = playlist.contents.items;
	return tracks;
};

export const getRootlist = async () => {
	const rootlist = (await Spicetify.Platform.RootlistAPI.getContents({ flatten: true })) as RootlistResponse;
	return rootlist.items;
};

export const getAlbumMeta = (uri: string) => {
	return (
		Spicetify.GraphQL.Request(Spicetify.GraphQL.Definitions.getAlbum, {
			uri,
			offset: 0,
			limit: 1,
			locale: Spicetify.Locale.getLocale(),
		}) as Promise<getAlbumResponse>
	).then((res) => res.data.albumUnion);
};

export const getAlbumMetas = (uris: string[]) => {
	return Promise.all(uris.map((uri) => getAlbumMeta(uri)));
};

export const queryInLibrary = async (uris: string[]) => {
	return Spicetify.Platform.LibraryAPI.contains(...uris) as Promise<boolean[]>;
};
