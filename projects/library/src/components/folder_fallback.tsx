import React from "react";

const FolderSVG = (e: any): React.ReactElement<SVGElement> => {
	return (
		<Spicetify.ReactComponent.IconComponent
			semanticColor="textSubdued"
			viewBox="0 0 24 24"
			size={"xxlarge"}
			dangerouslySetInnerHTML={{
				__html:
					'<path d="M1 4a2 2 0 0 1 2-2h5.155a3 3 0 0 1 2.598 1.5l.866 1.5H21a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4zm7.155 0H3v16h18V7H10.464L9.021 4.5a1 1 0 0 0-.866-.5z"/>',
			}}
			{...e}
		/>
	);
};

export default FolderSVG;
