import React from "react";

interface InlineGridProps {
    special?: boolean;
    children: any;
};

function scrollGrid(event: React.MouseEvent): void {
    const { target } = event;
    if (!(target instanceof HTMLElement)) return;

    const grid = target.parentNode?.querySelector("div");
    if (!grid) return;
    grid.scrollLeft += grid.clientWidth;

    if (grid.scrollWidth - grid.clientWidth - grid.scrollLeft <= grid.clientWidth) {
        grid.setAttribute("data-scroll", "end");
    } else {
        grid.setAttribute("data-scroll", "both");
    }
};

function scrollGridLeft(event: React.MouseEvent): void {
    const { target } = event;
    if (!(target instanceof HTMLElement)) return;

    const grid = target.parentNode?.querySelector("div");
    if (!grid) return;
    grid.scrollLeft -= grid.clientWidth;

    if (grid.scrollLeft <= grid.clientWidth) {
        grid.setAttribute("data-scroll", "start");
    } else {
        grid.setAttribute("data-scroll", "both");
    }
};

function InlineGrid({ children, special }: InlineGridProps): React.ReactElement {
    return (
        <section className="stats-gridInlineSection">
            <button className="stats-scrollButton" onClick={scrollGridLeft}>
                {"<"}
            </button>
            <button className="stats-scrollButton" onClick={scrollGrid}>
                {">"}
            </button>
            <div className={`main-gridContainer-gridContainer stats-gridInline${special ? " stats-specialGrid" : ""}`} data-scroll="start">
                {children}
            </div>
        </section>
    );
};

export default InlineGrid;
