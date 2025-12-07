import React from "react";

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
				{label}
			</TextComponent>
		</div>
	);
}

export default StatCard;
