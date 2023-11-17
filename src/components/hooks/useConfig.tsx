import React, { useState } from "react";
import SettingsModal from "../settings_modal";
import { Config } from "../../types/stats_types";

export const getLocalStorageDataFromKey = (key: string, fallback?: unknown) => {
    const data = localStorage.getItem(key);
    if (data) {
        try {
            return JSON.parse(data);
        } catch (err) {
            return data;
        }
    } else {
        return fallback;
    }
};

const useConfig = (
    settings: { name: string; key: string; type: "toggle" | "text" | "dropdown"; def: any; options?: string[]; placeholder?: string; desc?: string }[]
) => {
    const settingsArray: Record<string, any>[] = settings.map(setting => {
        return { [setting.key]: getLocalStorageDataFromKey(`stats:config:${setting.key}`, setting.def) };
    });

    const [CONFIG, setCONFIG] = React.useState(Object.assign({}, ...settingsArray) as Config);

    const updateConfig = (config: Config) => {
        setCONFIG({ ...config });
        console.log("updated config", config);
    };

    const launchModal = () => {
        Spicetify.PopupModal.display({
            title: "Statistics Settings",
            // @ts-ignore
            content: <SettingsModal CONFIG={CONFIG} settings={settings} updateAppConfig={updateConfig} />,
            isLarge: true,
        });
    };

    return { CONFIG, launchModal };
};

export default useConfig;
