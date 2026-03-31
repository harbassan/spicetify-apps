import React from "react";

const LoadMoreCard = (props: { callback: () => void }) => {
	const { callback } = props;
	return (
		<button type="button" onClick={callback} className="load-more-card main-card-card">
			<div className="svg-placeholder">
				<svg viewBox="0 8 24 8" xmlns="http://www.w3.org/2000/svg">
					<circle cx="17.5" cy="12" r="1.5"></circle>
					<circle cx="12" cy="12" r="1.5"></circle>
					<circle cx="6.5" cy="12" r="1.5"></circle>
				</svg>
			</div>
			<div style={{ fontWeight: "bold", color: "var(--spice-text)" }}>
				Load More
			</div>
		</button>
	);
};

export default LoadMoreCard;
