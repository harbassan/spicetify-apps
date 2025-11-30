import React from "react";

function NavigationBar({ links, selected, storekey }: { links: string[], selected: string, storekey: string }) {
    const { Chip } = Spicetify.ReactComponent;

    function navigate(page: string) {
        Spicetify.Platform.History.push(`/${storekey.split(":")[0]}/${page}`);
        Spicetify.LocalStorage.set(storekey, page);
    }

    return (
        <div className="u_wTfCtgm9HvxrphUxKd">
            {links.map(link =>
                <Chip aria-label={link} selected={selected === link} selectedColorSet="invertedLight" onClick={() => navigate(link)}>{link}</Chip>
            )}
        </div>
    );
};

export default NavigationBar;
