import React from "react";
import ReactDOM from "react-dom";

function NavigationBar({ links, selected, storekey }: { links: string[], selected: string, storekey: string }) {
    const { Chip } = Spicetify.ReactComponent;

    function navigate(page: string) {
        Spicetify.Platform.History.push(`/${storekey.split(":")[0]}/${page}`);
        Spicetify.LocalStorage.set(storekey, page);
    }

    return ReactDOM.createPortal(
        <div style={{ paddingTop: "8px", pointerEvents: "auto" }}>
            <div className="navbar-container">
                <div className="u_wTfCtgm9HvxrphUxKd">
                    {links.map(link =>
                        <Chip aria-label={link} selected={selected === link} selectedColorSet="invertedLight" onClick={() => navigate(link)}>{link}</Chip>
                    )}
                </div>
            </div>
        </div>,
        document.querySelector<HTMLDivElement>(".main-topBar-topbarContentWrapper")!
    );
};

export default NavigationBar;
