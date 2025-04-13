import React from "react";
import { LeftArrow } from "./icons/arrows";

const collapseLibrary = () => {
	Spicetify.Platform.LocalStorageAPI.setItem("left-sidebar-state", 1);
};

const CollapseButton = () => {
	const { ButtonTertiary } = Spicetify.ReactComponent;

	return <ButtonTertiary buttonSize="sm" aria-label="Show Filters" iconOnly={LeftArrow} onClick={collapseLibrary} />;
};

export default CollapseButton;
