import type * as Spotify from "../types/spotify";

const apiFetch = async <T>(name: string, url: string, log = true): Promise<T> => {
	try {
		const timeStart = window.performance.now();
		const response = await Spicetify.CosmosAsync.get(url);
		if (log) console.log("stats -", name, "fetch time:", window.performance.now() - timeStart);
		return response;
	} catch (error) {
		console.log("stats -", name, "request failed:", error);
		throw error;
	}
};

export const getTopTracks = (range: Spotify.SpotifyRange) => {
	return apiFetch<Spotify.TopTracksResponse>(
		"topTracks",
		`https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${range}`,
	).then((res) => res.items);
};

export const getTopArtists = (range: Spotify.SpotifyRange) => {
	return apiFetch<Spotify.TopArtistsResponse>(
		"topArtists",
		`https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${range}`,
	).then((res) => res.items);
};

export const getArtistMetas = (ids: string[]) => {
	return apiFetch<Spotify.SeveralArtistsResponse>("artistMetas", `https://api.spotify.com/v1/artists?ids=${ids}`).then(
		(res) => res.artists,
	);
};

export const getAlbumMetas = (ids: string[]) => {
	return apiFetch<Spotify.SeveralAlbumsResponse>("albumMetas", `https://api.spotify.com/v1/albums?ids=${ids}`).then(
		(res) => res.albums,
	);
};

export const getTrackMetas = (ids: string[]) => {
	return apiFetch<Spotify.SeveralTracksResponse>("trackMetas", `https://api.spotify.com/v1/tracks?ids=${ids}`).then(
		(res) => res.tracks,
	);
};

export const getAudioFeatures = (ids: string[]) => {
	return apiFetch<Spotify.SeveralAudioFeaturesResponse>(
		"audioFeatures",
		`https://api.spotify.com/v1/audio-features?ids=${ids}`,
	).then((res) => res.audio_features);
};

export const searchForTrack = (track: string, artist: string) => {
	return apiFetch<Spotify.SearchResponse>(
		"searchForTrack",
		`https://api.spotify.com/v1/search?q=track:${track}+artist:${artist}&type=track`,
	).then((res) => res.tracks.items);
};

export const searchForArtist = (artist: string) => {
	return apiFetch<Spotify.SearchResponse>(
		"searchForArtist",
		`https://api.spotify.com/v1/search?q=artist:${artist}&type=artist`,
	).then((res) => res.artists.items);
};

export const searchForAlbum = (album: string, artist: string) => {
	return apiFetch<Spotify.SearchResponse>(
		"searchForAlbum",
		`https://api.spotify.com/v1/search?q=album:${album}+artist:${artist}&type=album`,
	).then((res) => res.albums.items);
};

export const queryLiked = (ids: string[]) => {
	return apiFetch<boolean[]>("queryLiked", `https://api.spotify.com/v1/me/tracks/contains?ids=${ids}`);
};

export const getPlaylistMeta = (id: string) => {
	return apiFetch<Spotify.PlaylistResponse>("playlistMeta", `https://api.spotify.com/v1/playlists/${id}`);
};

export const getUserPlaylists = () => {
	return apiFetch<Spotify.UserPlaylistsResponse>("userPlaylists", "https://api.spotify.com/v1/me/playlists").then(
		(res) => res.items,
	);
};
