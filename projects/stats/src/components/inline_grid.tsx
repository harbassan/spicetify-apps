import React from "react";

interface InlineGridProps {
	special?: boolean;
	children: React.ReactElement | React.ReactElement[];
}

function Chevron({ direction }: { direction: "left" | "right" }) {
	return (
		<svg
			className={`stats-scrollChevron stats-scrollChevron--${direction}`}
			viewBox="0 0 16 16"
			aria-hidden="true"
		>
			<path d="M10.5 3.5 6 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function InlineGrid(props: InlineGridProps): React.ReactElement<HTMLTableSectionElement> {
	const { children, special } = props;
	const gridRef = React.useRef<HTMLDivElement>(null);
	const [scrollState, setScrollState] = React.useState<"start" | "both" | "end">("start");

	const syncScrollState = React.useCallback(() => {
		const grid = gridRef.current;
		if (!grid) return;

		const maxScroll = grid.scrollWidth - grid.clientWidth;
		if (maxScroll <= 4) {
			setScrollState("start");
			return;
		}

		if (grid.scrollLeft <= 4) {
			setScrollState("start");
			return;
		}

		if (grid.scrollLeft >= maxScroll - 4) {
			setScrollState("end");
			return;
		}

		setScrollState("both");
	}, []);

	React.useEffect(() => {
		syncScrollState();
	}, [children, syncScrollState]);

	const scrollByPage = (direction: -1 | 1) => {
		const grid = gridRef.current;
		if (!grid) return;

		grid.scrollBy({ left: direction * Math.max(grid.clientWidth - 48, 160), behavior: "smooth" });
		window.setTimeout(syncScrollState, 180);
	};

	return (
		<section className="stats-gridInlineSection" data-scroll={scrollState}>
			<button className="stats-scrollButton stats-scrollButton--left" onClick={() => scrollByPage(-1)} aria-label="Scroll left">
				<Chevron direction="left" />
			</button>
			<button className="stats-scrollButton stats-scrollButton--right" onClick={() => scrollByPage(1)} aria-label="Scroll right">
				<Chevron direction="right" />
			</button>
			<div
				ref={gridRef}
				className={`main-gridContainer-gridContainer stats-gridInline${special ? " stats-specialGrid" : ""}`}
				onScroll={syncScrollState}
			>
				{children}
			</div>
		</section>
	);
}

export default InlineGrid;
