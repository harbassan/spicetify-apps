import type { getAlbumResponse } from "../types/graph_ql";
import type { PlaylistResponse, RootlistResponse } from "../../../shared/types/platform";
import type { ArtistOverviewResponse } from "../types/artist_overview";

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
	).then((res) => res?.data?.albumUnion);
};

export const getAlbumMetas = (uris: string[]) => {
	return Promise.all(uris.map((uri) => getAlbumMeta(uri)));
};

export const queryInLibrary = async (uris: string[]) => {
	return Spicetify.Platform.LibraryAPI.contains(...uris) as Promise<boolean[]>;
};

export const getArtistOverview = async (uri: string) => {
	// Guard for missing GraphQL definition (older Spicetify versions)
	if (!Spicetify.GraphQL?.Definitions?.queryArtistOverview) {
		throw new Error("queryArtistOverview GraphQL definition not found. This feature requires a recent version of Spicetify.");
	}

	const res = (await Spicetify.GraphQL.Request(Spicetify.GraphQL.Definitions.queryArtistOverview, {
		uri,
		locale: Spicetify.Locale.getLocale(),
		includePrerelease: true,
	})) as ArtistOverviewResponse;
	const result = res?.data?.artistUnion;
	if (!result) throw new Error("Artist data not found");
	return result;
};
