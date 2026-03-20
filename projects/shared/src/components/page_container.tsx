const React = window.Spicetify.React;

interface PageContainerProps {
    lhs: React.ReactNode[];
    rhs?: React.ReactNode[];
    children: React.ReactElement | React.ReactElement[];
}

const PageContainer = (props: PageContainerProps) => {
    const { rhs, lhs, children } = props;

    function parseNodes(nodes: React.ReactNode[]) {
        return nodes.map(node => typeof node === "string"
            ? <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--spice-text)" }}>{node}</h1>
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
