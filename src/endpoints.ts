import { filter } from "./funcs";

const lfmperiods: Record<string, string> = {
    short_term: "1month",
    medium_term: "6month",
    long_term: "overall",
};

export const LASTFM = {
    toptracks: (user: string, key: string, range: string) =>
        `http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${user}&api_key=${key}&format=json&period=${lfmperiods[range]}`,
    topalbums: (user: string, key: string, range: string) =>
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${user}&api_key=${key}&format=json&period=${lfmperiods[range]}`,
    topartists: (user: string, key: string, range: string) =>
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user}&api_key=${key}&format=json&period=${lfmperiods[range]}`,
    charts: (key: string, type: string) => `http://ws.audioscrobbler.com/2.0/?method=chart.gettop${type}&api_key=${key}&format=json`,
};

export const SPOTIFY = {
    toptracks: (range: string) => `https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${range}`,
    topartists: (range: string) => `https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${range}`,
    artists: (artists: string) => `https://api.spotify.com/v1/artists?ids=${filter(artists)}`,
    rootlist: "sp://core-playlist/v1/rootlist",
    playlist: (uri: string) => `sp://core-playlist/v1/playlist/${uri}`,
    search: (track: string, artist: string) => `https://api.spotify.com/v1/search?q=track:${filter(track)}+artist:${filter(artist)}&type=track`,
    searchartist: (artist: string) => `https://api.spotify.com/v1/search?q=artist:${filter(artist)}&type=artist`,
    searchalbum: (album: string, artist: string) => `https://api.spotify.com/v1/search?q=${filter(album)}+artist:${filter(artist)}&type=album`,
    audiofeatures: (ids: string) => `https://api.spotify.com/v1/audio-features?ids=${ids}`,
    queryliked: (ids: string) => `https://api.spotify.com/v1/me/tracks/contains?ids=${ids}`,
};

export const PLACEHOLDER = "https://raw.githubusercontent.com/harbassan/spicetify-stats/main/src/styles/placeholder.png";
