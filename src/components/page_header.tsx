import React from "react";
import RefreshButton from "./buttons/refresh_button";
import SettingsButton from "./buttons/settings_button";

interface PageHeaderProps {
    title: string;
    callback: () => void;
    config: any;
    dropdown: any;
    children: any;
}

const PageHeader = ({ title, callback, config, dropdown, children }: PageHeaderProps) => {
    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="TypeElement-canon-type">
                        {title}
                    </h1>
                    <div className="collection-searchBar-searchBar">
                        <RefreshButton refreshCallback={callback} />
                        <SettingsButton config={config} />
                        {dropdown}
                    </div>
                </div>
                <div>{children}</div>
            </section>
        </>
    );
};

export default React.memo(PageHeader);
