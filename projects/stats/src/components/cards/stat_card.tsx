import React from "react";

interface StatCardProps {
	label: string;
	value: number | string;
}

function StatCard({ label, value }: StatCardProps) {
	return (
		<div className="main-card-card" style={{ background: "var(--spice-card)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
			<div style={{ fontSize: "24px", fontWeight: "bold", color: "white", marginBottom: "8px" }}>
				{value}
			</div>
			<div style={{ fontSize: "14px", color: "var(--spice-subtext)", textTransform: "uppercase", letterSpacing: "1px" }}>
				{label}
			</div>
		</div>
	);
}

export default StatCard;
