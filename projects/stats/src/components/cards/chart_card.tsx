import React from "react";

const ChartLine = (name: string, value: number, limit: number, total: number) => {
	const pxAdjust = limit <= 1 ? 0 : ((limit - value) / (limit - 1)) * 100;
	return (
		<div className="stats-genreRow" key={name}>
			<div
				className="stats-genreRowFill"
				style={{
					width: `calc(${(value / limit) * 100}% + ${pxAdjust}px)`,
				}}
			>
				<span className="stats-genreText">{name}</span>
			</div>
			<span className="stats-genreValue">{`${Math.round((value / total) * 100)}%`}</span>
		</div>
	);
};

const ChartCard = ({ data }: { data: Record<string, number> }) => {
	const INITIAL_COUNT = 10;
	const [extended, setExtended] = React.useState(false);
	const total = Object.values(data).reduce((acc, curr) => acc + curr, 0);
	const entries = Object.entries(data)
		.sort(([, a], [, b]) => b - a)
		.filter(([, value]) => total > 0 && Math.round((value / total) * 100) > 0);

	if (entries.length === 0) {
		return <div className={"main-card-card stats-genreCard stats-genreCardEmpty"}>No data available</div>;
	}

	const keys = entries.map(([key]) => key).slice(0, extended ? entries.length : INITIAL_COUNT);

	return (
		<div className={"main-card-card stats-genreCard"}>
			{keys.map((key) => ChartLine(key, data[key], data[keys[0]], total))}
			{entries.length > INITIAL_COUNT && (
				<button
					type="button"
					className={"extend-button"}
					onClick={() => {
						setExtended(!extended);
					}}
				>
					{extended ? "Show Less" : `Show More (${entries.length - INITIAL_COUNT})`}
				</button>
			)}
		</div>
	);
};

export default ChartCard;
