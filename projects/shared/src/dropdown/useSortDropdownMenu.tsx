import React, { useState } from "react";
import SortDropdownMenu from "./sort_dropdown";

interface OptionProps {
	id: string;
	name: string;
}

// don't know why type inference doesn't work when consuming this hook
type ReturnType = [
	dropdown: React.JSX.Element,
	activeOption: OptionProps,
	isReversed: boolean,
	setActiveOption: React.Dispatch<React.SetStateAction<OptionProps>>,
	setAvailableOptions: React.Dispatch<React.SetStateAction<OptionProps[]>>,
];

const useSortDropdownMenu = (options: OptionProps[], storageVariable?: string) => {
	const initialOptionID = storageVariable && Spicetify.LocalStorage.get(`${storageVariable}:active-option`);
	const initialOption = initialOptionID && options.find((e) => e.id === initialOptionID);
	const [activeOption, setActiveOption] = useState(initialOption || options[0]);
	const [isReversed, setIsReversed] = useState(false);
	const [availableOptions, setAvailableOptions] = useState(options);
	const dropdown = (
		<SortDropdownMenu
			options={availableOptions}
			isReversed={isReversed}
			activeOption={activeOption}
			switchCallback={(option: OptionProps) => {
				setIsReversed((prev) => option.id === activeOption.id ? !prev : prev);
				setActiveOption(option);
				if (storageVariable) Spicetify.LocalStorage.set(`${storageVariable}:active-option`, option.id);
			}}
		/>
	);

	return [dropdown, activeOption, isReversed, setActiveOption, setAvailableOptions] as ReturnType;
};

export default useSortDropdownMenu;