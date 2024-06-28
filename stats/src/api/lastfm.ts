import type * as LastFM from "../types/lastfm";

const lfmperiods = {
	short_term: "1month",
	medium_term: "6month",
	long_term: "overall",
} as const;

export const getTopTracks = (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${user}&api_key=${key}&limit=100&format=json&period=${lfmperiods[range]}`;
	return fetch(url)
		.then((res) => res.json() as Promise<LastFM.TopTracksResponse>)
		.then((res) => res.toptracks.track);
};

export const getTopArtists = (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user}&api_key=${key}&limit=100&format=json&period=${lfmperiods[range]}`;
	return fetch(url)
		.then((res) => res.json() as Promise<LastFM.TopArtistsResponse>)
		.then((res) => res.topartists.artist);
};

export const getTopAlbums = (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${user}&api_key=${key}&limit=100&format=json&period=${lfmperiods[range]}`;
	return fetch(url)
		.then((res) => res.json() as Promise<LastFM.TopAlbumsResponse>)
		.then((res) => res.topalbums.album);
};

export const getArtistChart = (key: string) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${key}&format=json`;
	return fetch(url)
		.then((res) => res.json() as Promise<LastFM.ArtistChartResponse>)
		.then((res) => res.artists.artist);
};

export const getTrackChart = (key: string) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${key}&format=json`;
	return fetch(url)
		.then((res) => res.json() as Promise<LastFM.TrackChartResponse>)
		.then((res) => res.tracks.track);
};
