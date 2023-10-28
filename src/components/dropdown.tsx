import React from "react";

interface DropdownMenuProps {
    options: string[];
    activeOption: string;
    switchCallback: (option: string) => void;
}

const activeStyle = {
    backgroundColor: "rgba(var(--spice-rgb-selected-row),.1)",
};

const Icon = (props: Spicetify.ReactComponent.IconComponentProps) => {
    return (
        <Spicetify.ReactComponent.IconComponent
            {...props}
            className="Svg-img-16 Svg-img-16-icon Svg-img-icon Svg-img-icon-small"
            data-encore-id="icon"
            viewBox="0 0 16 16"
            height="16"
            width="16"
        >
            <path d="M15.53 2.47a.75.75 0 0 1 0 1.06L4.907 14.153.47 9.716a.75.75 0 0 1 1.06-1.06l3.377 3.376L14.47 2.47a.75.75 0 0 1 1.06 0z"></path>
        </Spicetify.ReactComponent.IconComponent>
    );
};

const MenuItem = ({ option, isActive, switchCallback }: { option: string; isActive: boolean; switchCallback: (option: string) => void }) => {
    return (
        <Spicetify.ReactComponent.MenuItem
            trigger="click"
            onClick={() => switchCallback(option)}
            data-checked={isActive}
            trailingIcon={isActive && <Icon />}
            style={isActive ? activeStyle : undefined}
        >
            {option}
        </Spicetify.ReactComponent.MenuItem>
    );
};

const DropdownMenu = ({ options, activeOption, switchCallback }: DropdownMenuProps) => {
    const optionItems = options.map(option => {
        return <MenuItem option={option} isActive={option === activeOption} switchCallback={switchCallback} />;
    });

    const MenuWrapper = (props: Spicetify.ReactComponent.MenuProps) => {
        return (
            <>
                <Spicetify.ReactComponent.Menu {...props}>{optionItems}</Spicetify.ReactComponent.Menu>
            </>
        );
    };

    return (
        <>
            <Spicetify.ReactComponent.ContextMenu menu={<MenuWrapper />} trigger="click">
                <button
                    className="x-sortBox-sortDropdown"
                    type="button"
                    role="combobox"
                    aria-controls="sortboxlist-29ad4489-2ff4-4a03-8c0c-ffc6f90c2fed"
                    aria-expanded="false"
                >
                    <span className="TypeElement-mesto-type" data-encore-id="type">
                        {activeOption}
                    </span>
                    <svg
                        role="img"
                        height="16"
                        width="16"
                        aria-hidden="true"
                        className="Svg-img-16 Svg-img-16-icon Svg-img-icon Svg-img-icon-small"
                        viewBox="0 0 16 16"
                        data-encore-id="icon"
                    >
                        <path d="m14 6-6 6-6-6h12z"></path>
                    </svg>
                </button>
            </Spicetify.ReactComponent.ContextMenu>
        </>
    );
};

export default DropdownMenu;
