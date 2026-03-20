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

function getOptionLabel(option: Option | undefined): string {
    if (!option) return "";
    return typeof option.name === "string" ? option.name : String(option.name);
}

const DropdownMenu = (props: DropdownMenuProps) => {
    const { options, activeOption, switchCallback } = props;
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(event.target as Node)) setOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        window.addEventListener("mousedown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("mousedown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    const selectOption = (option: Option) => {
        switchCallback(option);
        setOpen(false);
    };

    return (
        <div className="x-sortBox-sortDropdown stats-filterDropdown" ref={rootRef}>
            <button
                type="button"
                className="stats-filterDropdown-trigger"
                aria-label="Select filter"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span>{getOptionLabel(activeOption)}</span>
            </button>
            {open && (
                <ul className="stats-filterDropdown-menu" role="listbox" aria-label="Filter options">
                    {options.map((option) => {
                        const active = option.id === activeOption.id;
                        return (
                            <li key={option.id} role="option" aria-selected={active}>
                                <button
                                    type="button"
                                    className={`stats-filterDropdown-option${active ? " is-active" : ""}`}
                                    onClick={() => selectOption(option)}
                                >
                                    {getOptionLabel(option)}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default DropdownMenu;
