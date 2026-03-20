const React = window.Spicetify.React;

function NavigationBar({ links, selected, storekey }: { links: string[], selected: string, storekey: string }) {
    const { Chip } = window.Spicetify.ReactComponent;
    const reactDOM = window.Spicetify?.ReactDOM;
    const portalTarget = document.querySelector<HTMLDivElement>(".main-topBar-topbarContentWrapper");

    function navigate(page: string) {
        Spicetify.Platform.History.push(`/${storekey.split(":")[0]}/${page}`);
        Spicetify.LocalStorage.set(storekey, page);
    }

    const content = (
        <div style={{ paddingTop: "8px", pointerEvents: "auto" }}>
            <div className="navbar-container">
                <div className="u_wTfCtgm9HvxrphUxKd">
                    {links.map(link =>
                        <Chip key={link} aria-label={link} selected={selected === link} selectedColorSet="invertedLight" onClick={() => navigate(link)}>
                            {link}
                        </Chip>
                    )}
                </div>
            </div>
        </div>
    );

    if (reactDOM?.createPortal && portalTarget) {
		return reactDOM.createPortal(content, portalTarget);
	}

	return content;
};

export default NavigationBar;
