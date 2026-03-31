import React from "react";

interface Option {
    id: string;
    name: string;
}

interface DropdownMenuProps {
    options: Option[];
    activeOption: Option;
    switchCallback: (option: Option) => void;
}

const DropdownMenu = ({ options, activeOption, switchCallback }: DropdownMenuProps) => {
    const measureRef = React.useRef<HTMLSpanElement>(null);
    const [selectWidth, setSelectWidth] = React.useState<number | undefined>(undefined);

    React.useLayoutEffect(() => {
        if (measureRef.current) {
            // 16px right padding + 12px left padding + 2px border
            setSelectWidth(measureRef.current.scrollWidth + 30);
        }
    }, [activeOption.id]);

    return (
        <label className="stats-native-select-wrapper">
            <span className="stats-native-select-label">Range</span>
            <span className="stats-native-select-measure" ref={measureRef} aria-hidden="true">
                {activeOption.name}
            </span>
            <select
                className="stats-native-select"
                aria-label="Select option"
                value={activeOption.id}
                style={selectWidth ? { width: `${selectWidth}px` } : undefined}
                onChange={(event) => {
                    const option = options.find((item) => item.id === event.target.value);
                    if (option) switchCallback(option);
                }}
            >
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </label>
    );
};

export default DropdownMenu;
