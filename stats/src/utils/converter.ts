import { searchForAlbum, searchForArtist, searchForTrack } from "../api/spotify";
import type * as LastFM from "../types/lastfm";
import type * as Spotify from "../types/spotify";

const minifyArtist = (artist: Spotify.Artist) => ({
	id: artist.id,
	name: artist.name,
	image: artist.images.at(-1)?.url,
	uri: artist.uri,
	genres: artist.genres,
});

export const convertArtist = async (artist: LastFM.Artist) => {
	const searchRes = await searchForArtist(artist.name);
	const spotifyArtist = searchRes.find(
		(a) => a.name.localeCompare(artist.name, undefined, { sensitivity: "base" }) === 0,
	);
	if (!spotifyArtist) return artist;
	return { ...minifyArtist(spotifyArtist), playcount: artist.playcount, name: artist.name };
};

export const convertAlbum = async (album: LastFM.Album) => {
	const searchRes = await searchForAlbum(album.name, album.artist.name);
	const spotifyAlbum = searchRes.find(
		(a) => a.name.localeCompare(album.name, undefined, { sensitivity: "base" }) === 0,
	);
	if (!spotifyAlbum) return album;
	return {
		id: spotifyAlbum.id,
		uri: spotifyAlbum.uri,
		name: album.name,
		image: spotifyAlbum.images.at(-1)?.url,
		playcount: album.playcount,
	};
};

const minifyTrack = (track: Spotify.Track) => ({
	id: track.id,
	uri: track.uri,
	name: track.name,
	duration: track.duration_ms,
	popularity: track.popularity,
	explicit: track.explicit,
	image: track.album.images.at(-1)?.url,
	release_year: track.album.release_date.slice(0, 4),
	artists: track.artists.map((artist) => ({
		name: artist.name,
		uri: artist.uri,
	})),
	album: {
		name: track.album.name,
		uri: track.album.uri,
	},
});

export const convertTrack = async (track: LastFM.Track) => {
	const searchRes = await searchForTrack(track.name, track.artist.name);
	const spotifyTrack = searchRes.find(
		(t) => t.name.localeCompare(track.name, undefined, { sensitivity: "base" }) === 0,
	);
	if (!spotifyTrack) return track;
	return { ...minifyTrack(spotifyTrack), playcount: track.playcount, name: track.name };
};
