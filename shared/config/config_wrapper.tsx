import React from "react";
import ConfigModal from "./config_modal";
import { ConfigProps, ModalStructureProps } from "./config_types";

// works with both extensions and custom apps

class ConfigWrapper {
    Config: ConfigProps;
    launchModal: (callback?: (config: ConfigProps) => void) => void;

    constructor(modalStructure: ModalStructureProps, key: string) {
        const config = modalStructure.map((modalStructureRow) => {
            const value = ConfigWrapper.getLocalStorageDataFromKey(
                `${key}:config:${modalStructureRow.key}`,
                modalStructureRow.def
            );
            modalStructureRow.callback?.(value);
            return { [modalStructureRow.key]: value };
        });

        this.Config = Object.assign({}, ...config);

        this.launchModal = (callback) => {
            const updateConfig = (config: ConfigProps) => {
                this.Config = { ...config };
                callback?.(config);
            };

            Spicetify.PopupModal.display({
                title: `${key.charAt(0).toUpperCase() + key.slice(1)} Settings`,
                // @ts-ignore
                content: (
                    <ConfigModal
                        config={this.Config}
                        structure={modalStructure}
                        appKey={key}
                        updateAppConfig={updateConfig}
                    />
                ),
                isLarge: true,
            });
        };
    }

    static getLocalStorageDataFromKey = (key: string, fallback?: any) => {
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
}

export default ConfigWrapper;
