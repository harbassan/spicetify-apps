import React from "react";
import { sanitizeSvgPaths } from "../utils/sanitize_svg";

const LeadingIcon = ({ path }: { path: string }) => {
	// Sanitize the SVG path markup using an allowlist approach to prevent XSS.
	// The path prop contains SVG element strings (e.g. '<path d="..."/>') which
	// are parsed and only safe SVG elements/attributes are rendered.
	const safePaths = React.useMemo(() => sanitizeSvgPaths(path), [path]);

	return (
		<Spicetify.ReactComponent.IconComponent
			semanticColor="textSubdued"
			iconSize={16}
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
				{safePaths}
			</svg>
		</Spicetify.ReactComponent.IconComponent>
	);
};

export default LeadingIcon;
