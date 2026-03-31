import React from "react";

interface ShelfProps {
	title: string;
	children: React.ReactElement | React.ReactElement[];
}

function Shelf(props: ShelfProps): React.ReactElement {
	const { title, children } = props;

	return (
		<section className="main-shelf-shelf Shelf">
			<div className="main-shelf-header">
				<div className="main-shelf-topRow">
					<div className="main-shelf-titleWrapper">
						<h2 className="stats-shelfTitle">{title}</h2>
					</div>
				</div>
			</div>
			<section>{children}</section>
		</section>
	);
}

export default React.memo(Shelf);
