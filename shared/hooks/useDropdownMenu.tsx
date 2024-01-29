import React, { useState } from "react";
import DropdownMenu from "../components/dropdown";

const useDropdownMenu = (
    options: string[],
    displayOptions: string[],
    storageVariable: string
): [JSX.Element, string, (link: string) => void] => {
    const initialOption = Spicetify.LocalStorage.get(`stats:${storageVariable}:active-option`);
    const [activeOption, setActiveOption] = useState(initialOption || options[0]);
    const dropdown = (
        <DropdownMenu
            options={displayOptions}
            activeOption={displayOptions[options.indexOf(activeOption)]}
            switchCallback={(option: string) => {
                setActiveOption(options[displayOptions.indexOf(option)]);
                Spicetify.LocalStorage.set(
                    `stats:${storageVariable}:active-option`,
                    options[displayOptions.indexOf(option)]
                );
            }}
        />
    );

    return [dropdown, activeOption, setActiveOption];
};

export default useDropdownMenu;
