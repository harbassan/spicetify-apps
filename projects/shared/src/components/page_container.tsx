import React from "react";

interface PageContainerProps {
    lhs: React.ReactNode[];
    rhs?: React.ReactNode[];
    children: React.ReactNode;
}

const PageContainer = (props: PageContainerProps) => {
    const { rhs, lhs, children } = props;

    function parseNodes(nodes: React.ReactNode[]) {
        return nodes.map((node, index) => typeof node === "string"
            ? <h1 key={node} className="stats-page-title">{node}</h1>
            : <React.Fragment key={index}>{node}</React.Fragment>
        );
    }
    return (
        <section className="contentSpacing">
            <div className={"page-header"}>
                <div className="header-left">{parseNodes(lhs)}</div>
                <div className="header-right">{rhs}</div>
            </div>
            <div className={"page-content"}>{children}</div>
        </section>
    );
};

export default PageContainer;
