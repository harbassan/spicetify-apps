import React from "react";

const ChartLine = (name: string, value: number, limit: number, total: number) => {
	return (
		<div className="stats-genreRow">
			<div
				className="stats-genreRowFill"
				style={{
					width: `calc(${(value / limit) * 100}% + ${((limit - value) / (limit - 1)) * 100}px)`,
				}}
			>
				<span className="stats-genreText">{name}</span>
			</div>
			<span className="stats-genreValue">{`${Math.round((value / total) * 100)}%`}</span>
		</div>
	);
};

const ChartCard = ({ data }: { data: Record<string, number> }) => {
	const [extended, setExtended] = React.useState(false);

	const keys = Object.keys(data)
		.sort((a, b) => data[b] - data[a])
		.slice(0, extended ? 50 : 10);

	const total = Object.values(data).reduce((acc, curr) => acc + curr, 0);

	return (
		<div className={"main-card-card stats-genreCard"}>
			{keys.map((key) => ChartLine(key, data[key], data[keys[0]], total))}
			<button
				type="button"
				className={"extend-button"}
				onClick={() => {
					setExtended(!extended);
				}}
			>
				{extended ? "See Less" : "See More"}
			</button>
		</div>
	);
};

export default ChartCard;
