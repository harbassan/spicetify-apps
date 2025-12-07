import type * as LastFM from "../types/lastfm";
import { apiFetch } from "./spotify";

const lfmperiods = {
	extra_short_term: "7day",
	short_term: "1month",
	medium_term: "6month",
	long_term: "overall",
} as const;

const val = <T>(res: T | undefined) => {
	if (!res || (Array.isArray(res) && !res.length)) throw new Error("Lastfm returned an empty result. Try again later.");
	return res;
};

export const getTopTracks = (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${user}&api_key=${key}&limit=100&format=json&period=${lfmperiods[range]}`;
	return apiFetch<LastFM.TopTracksResponse>("lfmTopTracks", url).then((res) => val(res?.toptracks?.track));
};

export const getTopArtists = (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user}&api_key=${key}&limit=100&format=json&period=${lfmperiods[range]}`;
	return apiFetch<LastFM.TopArtistsResponse>("lfmTopArtists", url).then((res) => val(res?.topartists?.artist));
};

export const getTopAlbums = (key: string, user: string, range: keyof typeof lfmperiods) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${user}&api_key=${key}&limit=100&format=json&period=${lfmperiods[range]}`;
	return apiFetch<LastFM.TopAlbumsResponse>("lfmTopAlbums", url).then((res) => val(res?.topalbums?.album));
};

export const getArtistChart = (key: string) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${key}&format=json`;
	return apiFetch<LastFM.ArtistChartResponse>("lfmArtistChart", url).then((res) => val(res?.artists?.artist));
};

export const getTrackChart = (key: string) => {
	const url = `http://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${key}&format=json`;
	return apiFetch<LastFM.TrackChartResponse>("lfmTrackChart", url).then((res) => val(res?.tracks?.track));
};
