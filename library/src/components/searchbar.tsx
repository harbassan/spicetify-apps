import React from "react";

interface SearchBarProps {
	setSearch: (value: string) => void;
	placeholder?: string;
}

const SearchBar = (props: SearchBarProps) => {
	const { setSearch, placeholder } = props;

	const handleChange = (e: any) => {
		setSearch(e.target.value);
	};

	return (
		<div className="x-filterBox-filterInputContainer x-filterBox-expandedOrHasFilter" role="search">
			<input
				type="text"
				className="x-filterBox-filterInput"
				role="searchbox"
				maxLength={80}
				autoCorrect="off"
				autoCapitalize="off"
				spellCheck="false"
				placeholder={`Search ${placeholder}`}
				aria-hidden="false"
				onChange={handleChange}
			/>
			<div className="x-filterBox-overlay">
				<span className="x-filterBox-searchIconContainer">
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						className="Svg-sc-ytk21e-0 Svg-img-icon-small x-filterBox-searchIcon"
						viewBox="0 0 16 16"
					>
						<path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.304 12.2A6.75 6.75 0 0 1 .25 7z"></path>
					</svg>
				</span>
			</div>
			<button className="x-filterBox-expandButton" aria-hidden="false" aria-label="Search Playlists">
				<svg
					data-encore-id="icon"
					role="img"
					aria-hidden="true"
					className="Svg-sc-ytk21e-0 Svg-img-icon-small x-filterBox-searchIcon"
					viewBox="0 0 16 16"
				>
					<path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.304 12.2A6.75 6.75 0 0 1 .25 7z"></path>
				</svg>
			</button>
		</div>
	);
};

export default SearchBar;
