import React from "react";
import _ from "lodash";

interface StatCardProps {
	label: string;
	value: number | string;
}

function StatCard({ label, value }: StatCardProps) {
	const { TextComponent } = Spicetify.ReactComponent;

	return (
		<div className="main-card-card">
			<TextComponent as="div" semanticColor="textBase" variant="alto">
				{value}
			</TextComponent>
			<TextComponent as="div" semanticColor="textBase" variant="balladBold">
				{_.startCase(label)}
			</TextComponent>
		</div>
	);
}

export default StatCard;
