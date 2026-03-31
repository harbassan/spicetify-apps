import React from "react";

function BackIcon(): React.ReactElement<SVGElement> {
	return (
		<Spicetify.ReactComponent.IconComponent
			semanticColor="textSubdued"
			iconSize={16}
		>
			{/* Safe: static SVG content with no dynamic data */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
				<path d="M15.957 2.793a1 1 0 0 1 0 1.414L8.164 12l7.793 7.793a1 1 0 1 1-1.414 1.414L5.336 12l9.207-9.207a1 1 0 0 1 1.414 0z" />
			</svg>
		</Spicetify.ReactComponent.IconComponent>
	);
}

function BackButton({ url }: { url: string }) {
	const { TooltipWrapper } = Spicetify.ReactComponent;

	function navigate() {
		Spicetify.Platform.History.replace(`/library/${url}`);
		Spicetify.LocalStorage.set("library:active-link", url);
	}

	return (
		<TooltipWrapper label={"Back"} placement="top">
			<span>
				<button className="stats-icon-button" type="button" aria-label="Back" onClick={navigate}>
					<BackIcon />
				</button>
			</span>
		</TooltipWrapper>
	);
}

export default BackButton;
