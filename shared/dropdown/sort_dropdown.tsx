import { DownArrow, UpArrow } from "library/src/components/icons/arrows";
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

interface SortDropdownMenuProps extends DropdownMenuProps {
	isReversed: boolean;
}

interface MenuItemProps {
	option: Option;
	isActive: boolean;
	switchCallback: (option: Option) => void;
}

interface SortMenuItemProps extends MenuItemProps {
	isReversed: boolean;
}
const SortMenuItem = (props: SortMenuItemProps) => {
	const { ReactComponent } = Spicetify;
	const { option, isActive, isReversed, switchCallback } = props;

	const activeStyle = {
		backgroundColor: "rgba(var(--spice-rgb-selected-row),.1)",
	};

	return (
		<ReactComponent.MenuItem
			trigger="click"
			onClick={() => switchCallback(option)}
			data-checked={isActive}
			trailingIcon={isActive ? isReversed ? <DownArrow /> : <UpArrow /> : undefined}
			style={isActive ? activeStyle : undefined}
		>
			{option.name}
		</ReactComponent.MenuItem>
	);
};

const SortDropdownMenu = (props: SortDropdownMenuProps) => {
	const { ContextMenu, Menu, TextComponent } = Spicetify.ReactComponent;
	const { options, activeOption, isReversed, switchCallback } = props;

	const optionItems = options.map((option) => {
		return (
			<SortMenuItem
				option={option}
				isActive={option === activeOption}
				isReversed={isReversed}
				switchCallback={switchCallback}
			/>
		);
	});

	const MenuWrapper = (props: Spicetify.ReactComponent.MenuProps) => {
		return <Menu {...props}>{optionItems}</Menu>;
	};

	return (
		<ContextMenu menu={<MenuWrapper />} trigger="click">
			<button className="x-sortBox-sortDropdown" type="button" role="combobox" aria-expanded="false">
				<TextComponent variant="mesto" semanticColor="textSubdued">
					{activeOption.name}
					{isReversed ? <DownArrow /> : <UpArrow />}
				</TextComponent>
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
		</ContextMenu>
	);
};

export default SortDropdownMenu;