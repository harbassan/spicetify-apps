import React from "react";

const expandLibrary = () => {
	Spicetify.Platform.LocalStorageAPI.setItem("ylx-sidebar-state", 0);
};

const ExpandIcon = () => {
	const { IconComponent } = Spicetify.ReactComponent;

	return (
		<IconComponent
			semanticColor="textSubdued"
			iconSize={16}
		>
			{/* Safe: static SVG content with no dynamic data */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
				<path d="M7.19 1A.749.749 0 0 1 8.47.47L16 7.99l-7.53 7.521a.75.75 0 0 1-1.234-.815.75.75 0 0 1 .174-.243l5.72-5.714H.75a.75.75 0 1 1 0-1.498h12.38L7.41 1.529a.749.749 0 0 1-.22-.53z" />
			</svg>
		</IconComponent>
	);
};

const ExpandButton = () => {
	return (
		<button className="stats-icon-button" type="button" aria-label="Show Filters" onClick={expandLibrary}>
			<ExpandIcon />
		</button>
	);
};

export default ExpandButton;
