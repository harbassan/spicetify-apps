import React from "react";

function NavigationBar({ links, selected, storekey }: { links: string[], selected: string, storekey: string }) {
    function navigate(page: string) {
        Spicetify.Platform.History.push(`/${storekey.split(":")[0]}/${page}`);
        Spicetify.LocalStorage.set(storekey, page);
    }

    return (
        <div className="stats-nav-shell">
            <div className="navbar-container stats-nav-inline">
                {links.map((link) => (
                    <button
                        key={link}
                        type="button"
                        className={selected === link ? "stats-nav-chip is-active" : "stats-nav-chip"}
                        aria-pressed={selected === link}
                        onClick={() => navigate(link)}
                    >
                        {link}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default NavigationBar;
