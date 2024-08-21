import React from "react";
import LeadingIcon from "./leading_icon";

const ArtistMenuItem = () => {
	const { MenuItem } = Spicetify.ReactComponent;
	const { SVGIcons } = Spicetify;

	const context = React.useContext(Spicetify.ContextMenuV2._context);
	const uri = context?.props?.uri;

	return (
		<MenuItem
			divider="after"
			leadingIcon={<LeadingIcon path={SVGIcons.plus2px} />}
			onClick={() => CollectionsWrapper.createCollectionFromDiscog(uri)}
		>
			Create Discog Collection
		</MenuItem>
	);
};

export default ArtistMenuItem;
