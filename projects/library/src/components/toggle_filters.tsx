import React from "react";
import { DownArrow, UpArrow } from "../../../shared/src/icons/arrows";

const ToggleFiltersButton = () => {
	const [direction, setDirection] = React.useState(
		document.body.classList.contains("show-ylx-filters") ? "up" : "down",
	);
	const { ButtonTertiary } = Spicetify.ReactComponent;

	const toggleDirection = () => {
		if (direction === "down") {
			document.body.classList.add("show-ylx-filters");
			setDirection("up");
		} else {
			setDirection("down");
			document.body.classList.remove("show-ylx-filters");
		}
	};

	const Icon = direction === "down" ? DownArrow : UpArrow;

	return <ButtonTertiary buttonSize="sm" aria-label="Show Filters" iconOnly={Icon} onClick={toggleDirection} />;
};

export default ToggleFiltersButton;
