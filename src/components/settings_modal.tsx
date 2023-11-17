import React from "react";
import { Config } from "../types/stats_types";

interface Props {
    CONFIG: Config;
    settings: { name: string; key: string; type: "toggle" | "text" | "dropdown"; def: any; options?: string[]; placeholder?: string; desc: string }[];
    updateAppConfig: (CONFIG: Config) => void;
}

const Toggle = (props: {
    name: string;
    storageKey: string;
    enabled: boolean;
    clickable?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
    const toggleId = `toggle:${props.storageKey}`;

    return (
        <label className={"toggle-wrapper"}>
            <input
                className={"toggle-input"}
                type="checkbox"
                checked={props.enabled}
                data-storage-key={props.storageKey}
                id={toggleId}
                title={`Toggle for ${props.storageKey}`}
                onChange={props.onChange}
            />
            <span className={"toggle-indicator-wrapper"}>
                <span className={"toggle-indicator"}></span>
            </span>
        </label>
    );
};

const TextInput = (props: {
    name: string;
    storageKey: string;
    value: string | null;
    placeholder?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
    const textId = `text-input:${props.storageKey}`;

    return (
        <label className={"text-input-wrapper"}>
            <input
                className={"text-input"}
                type="text"
                value={props.value || ""}
                data-storage-key={props.storageKey}
                placeholder={props.placeholder}
                id={textId}
                title={`Text input for ${props.storageKey}`}
                onChange={props.onChange}
            />
        </label>
    );
};

const Dropdown = (props: {
    name: string;
    storageKey: string;
    value: string;
    options: string[];
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
    const dropdownId = `dropdown:${props.storageKey}`;

    return (
        <label className={"dropdown-wrapper"}>
            <select
                className={"dropdown-input"}
                value={props.value}
                data-storage-key={props.storageKey}
                id={dropdownId}
                title={`Dropdown for ${props.storageKey}`}
                onChange={props.onChange}
            >
                {props.options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </label>
    );
};
const TooltipIcon = () => {
    return (
        <svg role="img" height="16" width="16" className="Svg-sc-ytk21e-0 uPxdw nW1RKQOkzcJcX6aDCZB4" viewBox="0 0 16 16">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"></path>
            <path d="M7.25 12.026v-1.5h1.5v1.5h-1.5zm.884-7.096A1.125 1.125 0 007.06 6.39l-1.431.448a2.625 2.625 0 115.13-.784c0 .54-.156 1.015-.503 1.488-.3.408-.7.652-.973.818l-.112.068c-.185.116-.26.203-.302.283-.046.087-.097.245-.097.57h-1.5c0-.47.072-.898.274-1.277.206-.385.507-.645.827-.846l.147-.092c.285-.177.413-.257.526-.41.169-.23.213-.397.213-.602 0-.622-.503-1.125-1.125-1.125z"></path>
        </svg>
    );
};

const ConfigRow = (props: {
    name: string;
    storageKey: string;
    modalConfig: Config;
    updateConfig: (CONFIG: Config) => void;
    type: string;
    options?: string[];
    placeholder?: string;
    desc?: string;
}) => {
    // @ts-ignore
    const enabled = !!props.modalConfig[props.storageKey];
    // @ts-ignore
    const value = props.modalConfig[props.storageKey];

    const updateItem = (storageKey: string, state: any) => {
        // @ts-ignore
        props.modalConfig[storageKey] = state;
        console.debug(`toggling ${storageKey} to ${state}`);
        localStorage.setItem(`stats:config:${storageKey}`, String(state));

        // Saves the config settings to app as well as SettingsModal state
        props.updateConfig(props.modalConfig);
    };

    const settingsToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateItem(e.target.dataset.storageKey as string, e.target.checked);
    };

    const settingsTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateItem(e.target.dataset.storageKey as string, e.target.value);
    };

    const settingsDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateItem(e.target.dataset.storageKey as string, e.target.value);
    };

    const element = () => {
        switch (props.type) {
            case "dropdown":
                return (
                    <Dropdown name={props.name} storageKey={props.storageKey} value={value} options={props.options || []} onChange={settingsDropdownChange} />
                );
            case "text":
                return (
                    <TextInput name={props.name} storageKey={props.storageKey} value={value} placeholder={props.placeholder} onChange={settingsTextChange} />
                );
            default:
                return <Toggle name={props.name} storageKey={props.storageKey} enabled={enabled} onChange={settingsToggleChange} />;
        }
    };

    return (
        <div className="setting-row">
            <label className="col description">
                {props.name}
                {props.desc && (
                    <Spicetify.ReactComponent.TooltipWrapper
                        label={<div dangerouslySetInnerHTML={{ __html: props.desc }} />}
                        renderInline={true}
                        showDelay={10}
                        placement="top"
                        labelClassName="tooltip"
                        disabled={false}
                    >
                        <div className="tooltip-icon">
                            <TooltipIcon />
                        </div>
                    </Spicetify.ReactComponent.TooltipWrapper>
                )}
            </label>
            <div className="col action">{element()}</div>
        </div>
    );
};

const SettingsModal = ({ CONFIG, settings, updateAppConfig }: Props) => {
    const [modalConfig, setModalConfig] = React.useState({ ...CONFIG });

    const updateConfig = (CONFIG: Config) => {
        updateAppConfig({ ...CONFIG });
        setModalConfig({ ...CONFIG });
    };

    const configRows = settings.map(setting => {
        return (
            <ConfigRow
                name={setting.name}
                storageKey={setting.key}
                type={setting.type}
                options={setting.options}
                placeholder={setting.placeholder}
                desc={setting.desc}
                modalConfig={modalConfig}
                updateConfig={updateConfig}
            />
        );
    });

    return <div id="stats-config-container">{configRows}</div>;
};

export default SettingsModal;
