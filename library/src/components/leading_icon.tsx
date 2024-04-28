import React from "react";

const LeadingIcon = ({ path }: { path: string }) => {
    return (
        <Spicetify.ReactComponent.IconComponent
            semanticColor="textSubdued"
            dangerouslySetInnerHTML={{
                __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${path}</svg>`,
            }}
            iconSize={16}
        />
    );
};

export default LeadingIcon;
