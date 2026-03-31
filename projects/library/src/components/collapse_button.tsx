import React from "react";
import { LeftArrow } from "../../../shared/src/icons/arrows";

const collapseLibrary = () => {
	Spicetify.Platform.LocalStorageAPI.setItem("left-sidebar-state", 1);
};

const CollapseButton = () => {
	return (
		<button className="stats-icon-button" type="button" aria-label="Show Filters" onClick={collapseLibrary}>
			<LeftArrow />
		</button>
	);
};

export default CollapseButton;
