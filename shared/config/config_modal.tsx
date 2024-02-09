import React from "react";
import { ConfigProps, ModalStructureProps } from "./config_types";

interface ConfigModalProps {
    config: ConfigProps;
    structure: ModalStructureProps;
    appKey: string;
    updateAppConfig: (config: ConfigProps) => void;
}

interface TextInputProps {
    storageKey: string;
    value: string | null;
    placeholder?: string;
    callback: (e: any) => void;
}

interface DrowpdownInputProps {
    storageKey: string;
    value: string;
    options: string[];
    callback: (e: any) => void;
}

interface ToggleInputProps {
    storageKey: string;
    value: boolean;
    callback: (e: any) => void;
}

interface SliderInputProps {
    storageKey: string;
    value: number;
    min: number;
    max: number;
    step: number;
    callback: (e: any) => void;
}

const TextInput = (props: TextInputProps) => {
    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        props.callback(event.target.value);
    };

    return (
        <label className={"text-input-wrapper"}>
            <input
                className={"text-input"}
                type="text"
                value={props.value || ""}
                data-storage-key={props.storageKey}
                placeholder={props.placeholder}
                id={`text-input:${props.storageKey}`}
                title={`Text input for ${props.storageKey}`}
                onChange={handleTextChange}
            />
        </label>
    );
};

const Dropdown = (props: DrowpdownInputProps) => {
    const handleDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        props.callback(event.target.value);
    };

    return (
        <label className={"dropdown-wrapper"}>
            <select
                className={"dropdown-input"}
                value={props.value}
                data-storage-key={props.storageKey}
                id={`dropdown:${props.storageKey}`}
                title={`Dropdown for ${props.storageKey}`}
                onChange={handleDropdownChange}
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

const ToggleInput = (props: ToggleInputProps) => {
    // @ts-ignore
    const { Toggle } = Spicetify.ReactComponent;

    const handleToggleChange = (newValue: boolean) => {
        props.callback(newValue);
    };

    return (
        <Toggle
            id={`toggle:${props.storageKey}`}
            value={props.value}
            onSelected={(newValue: boolean) => handleToggleChange(newValue)}
        />
    );
};

const SliderInput = (props: SliderInputProps) => {
    const { Slider } = Spicetify.ReactComponent;

    const handleSliderChange = (newValue: number) => {
        const calculatedValue = props.min + newValue * (props.max - props.min);
        props.callback(calculatedValue);
    };

    const value = (props.value - props.min) / (props.max - props.min);
    return (
        <Slider
            id={`slider:${props.storageKey}`}
            value={value}
            min={0}
            max={1}
            step={0.1}
            onDragMove={(newValue: number) => handleSliderChange(newValue)}
            onDragStart={() => {}}
            onDragEnd={() => {}}
        />
    );
};

const TooltipIcon = () => {
    return (
        <svg
            role="img"
            height="16"
            width="16"
            className="Svg-sc-ytk21e-0 uPxdw nW1RKQOkzcJcX6aDCZB4"
            viewBox="0 0 16 16"
        >
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"></path>
            <path d="M7.25 12.026v-1.5h1.5v1.5h-1.5zm.884-7.096A1.125 1.125 0 007.06 6.39l-1.431.448a2.625 2.625 0 115.13-.784c0 .54-.156 1.015-.503 1.488-.3.408-.7.652-.973.818l-.112.068c-.185.116-.26.203-.302.283-.046.087-.097.245-.097.57h-1.5c0-.47.072-.898.274-1.277.206-.385.507-.645.827-.846l.147-.092c.285-.177.413-.257.526-.41.169-.23.213-.397.213-.602 0-.622-.503-1.125-1.125-1.125z"></path>
        </svg>
    );
};

const ConfigRow = (props: { name: string; desc?: string; children: React.ReactElement }) => {
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
            <div className="col action">{props.children}</div>
        </div>
    );
};

const ConfigModal = (props: ConfigModalProps) => {
    const { config, structure, appKey, updateAppConfig } = props;
    // local modal state
    const [modalConfig, setModalConfig] = React.useState({ ...config });

    const modalRows = structure.map((modalRow, index) => {
        const key = modalRow.key;
        const currentValue = modalConfig[key];

        const updateItem = (state: any) => {
            console.debug(`toggling ${key} to ${state}`);
            localStorage.setItem(`${appKey}:config:${key}`, String(state));

            if (modalRow.callback) modalRow.callback(state);

            // Saves the config settings to app as well as SettingsModal state
            const newConfig = { ...modalConfig };
            newConfig[key] = state;
            updateAppConfig(newConfig);
            setModalConfig(newConfig);
        };

        const header = modalRow.sectionHeader;

        const element = () => {
            switch (modalRow.type) {
                case "toggle":
                    return <ToggleInput storageKey={key} value={currentValue} callback={updateItem} />;
                case "text":
                    return <TextInput storageKey={key} value={currentValue} callback={updateItem} />;
                case "dropdown":
                    return (
                        <Dropdown
                            storageKey={key}
                            value={currentValue}
                            options={modalRow.options}
                            callback={updateItem}
                        />
                    );
                case "slider":
                    return (
                        <SliderInput
                            storageKey={key}
                            value={currentValue}
                            min={modalRow.min}
                            max={modalRow.max}
                            step={modalRow.step}
                            callback={updateItem}
                        />
                    );
            }
        };

        return (
            <>
                {header && index !== 0 && <br />}
                {header && <h2 className="section-header">{modalRow.sectionHeader}</h2>}
                <ConfigRow name={modalRow.name} desc={modalRow.desc}>
                    {element()}
                </ConfigRow>
            </>
        );
    });

    return <div className="config-container">{modalRows}</div>;
};

export default ConfigModal;
