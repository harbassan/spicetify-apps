import React from "react";

const scrollGrid = (event: any) => {
    const grid = event.target.parentNode.querySelector("div");

    grid.scrollLeft += grid.clientWidth;

    if (grid.scrollWidth - grid.clientWidth - grid.scrollLeft <= grid.clientWidth) {
        grid.setAttribute("data-scroll", "end");
    } else {
        grid.setAttribute("data-scroll", "both");
    }
};

const scrollGridLeft = (event: any) => {
    const grid = event.target.parentNode.querySelector("div");
    grid.scrollLeft -= grid.clientWidth;

    if (grid.scrollLeft <= grid.clientWidth) {
        grid.setAttribute("data-scroll", "start");
    } else {
        grid.setAttribute("data-scroll", "both");
    }
};

const InlineGrid = (props: any) => {
    return (
        <section className="stats-gridInlineSection">
            <button className="stats-scrollButton" onClick={scrollGridLeft}>
                {"<"}
            </button>
            <button className="stats-scrollButton" onClick={scrollGrid}>
                {">"}
            </button>
            <div className={`main-gridContainer-gridContainer stats-gridInline${props.special ? " stats-specialGrid" : ""}`} data-scroll="start">
                {props.children}
            </div>
        </section>
    );
};

export default InlineGrid;
