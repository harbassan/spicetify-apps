export interface Config extends Record<string, any>  {
    "api-key": string | null
    "lastfm-user" : string | null
    "use-lastfm" : boolean
    "show-artists" : boolean
    "show-tracks" : boolean
    "show-genres" : boolean
    "show-library" : boolean
    "show-charts" : boolean
}

export interface ConfigWrapper {
    CONFIG: Config
    launchModal: () => void
}