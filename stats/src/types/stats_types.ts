declare global {
    var SpicetifyStats: any;
}

export interface Config extends Record<string, any> {
    "api-key": string | null;
    "lastfm-user": string | null;
    "use-lastfm": boolean;
    "show-artists": boolean;
    "show-tracks": boolean;
    "show-genres": boolean;
    "show-library": boolean;
    "show-charts": boolean;
}

export interface ConfigWrapper {
    config: Config;
    launchModal: () => void;
}

export interface Track {
    liked: boolean;
    name: string;
    image: string;
    uri: string;
    id: string;
    artists: Artist[];
    duration: number;
    album: string;
    album_uri: string;
    popularity: number;
    explicit: boolean;
    release_year: string;
}

export interface Album {
    name: string;
    uri: string;
    image: string;
    freq?: number;
    id?: string;
}

interface Artist {
    name: string;
    uri: string;
    genres?: string[];
}

export interface ArtistCardProps extends Artist {
    image: string;
    freq?: number;
    id?: string;
}

export interface InfoToCreatePlaylist {
    playlistName: string;
    itemsUris: string[];
}
