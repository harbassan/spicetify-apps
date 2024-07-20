import React from "react";

const UpIcon = () => {
	const { IconComponent } = Spicetify.ReactComponent;

	return (
		<IconComponent
			semanticColor="textSubdued"
			dangerouslySetInnerHTML={{
				__html:
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M.998 8.81A.749.749 0 0 1 .47 7.53L7.99 0l7.522 7.53a.75.75 0 1 1-1.06 1.06L8.74 2.87v12.38a.75.75 0 1 1-1.498 0V2.87L1.528 8.59a.751.751 0 0 1-.53.22z"></path></svg>',
			}}
			iconSize={16}
		/>
	);
};

const DownIcon = () => {
	const { IconComponent } = Spicetify.ReactComponent;

	return (
		<IconComponent
			semanticColor="textSubdued"
			dangerouslySetInnerHTML={{
				__html:
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M.998 7.19A.749.749 0 0 0 .47 8.47L7.99 16l7.522-7.53a.75.75 0 1 0-1.06-1.06L8.74 13.13V.75a.75.75 0 1 0-1.498 0v12.38L1.528 7.41a.749.749 0 0 0-.53-.22z"></path></svg>',
			}}
			iconSize={16}
		/>
	);
};

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

	const Icon = direction === "down" ? DownIcon : UpIcon;

	return <ButtonTertiary buttonSize="sm" aria-label="Show Filters" iconOnly={Icon} onClick={toggleDirection} />;
};

export default ToggleFiltersButton;
