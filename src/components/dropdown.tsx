import React from "react";

interface TimeMenuItemProps extends Spicetify.ReactComponent.MenuItemProps {
    label: string;
}

interface DropdownMenuProps {
    links: string[];
    switchCallback: (value: string) => void;
}

const activeStyle = {
    backgroundColor: "rgba(var(--spice-rgb-selected-row),.1)",
};

const Icon = (props: Spicetify.ReactComponent.IconComponentProps) => {
    return (
        <Spicetify.ReactComponent.IconComponent
            {...props}
            className="Svg-sc-ytk21e-0 Svg-img-16-icon"
            data-encore-id="icon"
            viewBox="0 0 16 16"
            height="16"
            width="16"
        >
            <path d="M15.53 2.47a.75.75 0 0 1 0 1.06L4.907 14.153.47 9.716a.75.75 0 0 1 1.06-1.06l3.377 3.376L14.47 2.47a.75.75 0 0 1 1.06 0z"></path>
        </Spicetify.ReactComponent.IconComponent>
    );
};

const DropdownMenu = ({ links, switchCallback }: DropdownMenuProps) => {
    console.log("DropdownMenu render");

    const [activeOption, setActiveOption] = React.useState<string>(links[0]);

    const updateOption = React.useCallback((value: string) => {
        return () => {
            switchCallback(value);
            setActiveOption(value);
        };
    }, []);

    const MenuItem = ({ label, ...props }: TimeMenuItemProps) => {
        const isChecked = label === activeOption;
        return (
            <Spicetify.ReactComponent.MenuItem
                {...props}
                trigger="click"
                onClick={updateOption(label)}
                data-checked={isChecked}
                trailingIcon={isChecked && <Icon />}
                style={isChecked ? activeStyle : undefined}
            >
                {label}
            </Spicetify.ReactComponent.MenuItem>
        );
    };

    const optionItems = links.map((label, index) => {
        return <MenuItem label={label} key={index} />;
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
                    <span className="Type__TypeElement-sc-goli3j-0 TypeElement-mesto-type cvTLPmjt6T7M85EKcB8w" data-encore-id="type">
                        {activeOption}
                    </span>
                    <svg
                        role="img"
                        height="16"
                        width="16"
                        aria-hidden="true"
                        className="Svg-sc-ytk21e-0 Svg-img-16-icon SbDHY3fVADNJ4l9qOLQ2"
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

export default React.memo(DropdownMenu);
