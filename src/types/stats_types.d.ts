export interface Config  {
    ["api-key"]: string | null
}

export interface ConfigWrapper {
    CONFIG: Config
    launchModal: () => void
}