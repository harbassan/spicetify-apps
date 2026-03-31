import React from "react";
import { DownArrow, UpArrow } from "../../../shared/src/icons/arrows";

const ToggleFiltersButton = () => {
	const [direction, setDirection] = React.useState(
		document.body.classList.contains("show-ylx-filters") ? "up" : "down",
	);
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

	return (
		<button className="stats-icon-button" type="button" aria-label="Show Filters" onClick={toggleDirection}>
			<Icon />
		</button>
	);
};

export default ToggleFiltersButton;
