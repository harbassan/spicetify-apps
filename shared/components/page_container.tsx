import React from "react";

interface PageContainerProps {
    lhs: React.ReactNode[];
    rhs?: React.ReactNode[];
    children: React.ReactElement | React.ReactElement[];
}

const PageContainer = (props: PageContainerProps) => {
    const { rhs, lhs, children } = props;
    const { TextComponent } = Spicetify.ReactComponent;

    function parseNodes(nodes: React.ReactNode[]) {
        return nodes.map(node => typeof node === "string"
            ? <TextComponent children={node} as="h1" variant="canon" semanticColor="textBase" />
            : node
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
