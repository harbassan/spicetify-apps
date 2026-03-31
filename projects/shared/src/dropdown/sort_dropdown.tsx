import React from "react";

interface Option {
	id: string;
	name: string;
}

interface SortDropdownMenuProps {
	options: Option[];
	activeOption: Option;
	isReversed: boolean;
	showReverseButton?: boolean;
	switchCallback: (option: Option) => void;
}

const SortDropdownMenu = ({ options, activeOption, isReversed, showReverseButton = true, switchCallback }: SortDropdownMenuProps) => {
	const measureRef = React.useRef<HTMLSpanElement>(null);
	const [selectWidth, setSelectWidth] = React.useState<number | undefined>(undefined);

	React.useLayoutEffect(() => {
		if (measureRef.current) {
			// 16px right padding + 12px left padding + 2px border
			setSelectWidth(measureRef.current.scrollWidth + 30);
		}
	}, [activeOption.id]);

	return (
		<div className="stats-native-select-wrapper">
			<label className="stats-native-select-wrapper">
				<span className="stats-native-select-label">Sort</span>
				<span className="stats-native-select-measure" ref={measureRef} aria-hidden="true">
					{activeOption.name}
				</span>
				<select
					className="stats-native-select"
					aria-label="Sort option"
					value={activeOption.id}
					style={selectWidth ? { width: `${selectWidth}px` } : undefined}
					onChange={(event) => {
						const option = options.find((item) => item.id === event.target.value);
						if (option) switchCallback(option);
					}}
				>
					{options.map((option) => (
						<option key={option.id} value={option.id}>
							{option.name}
						</option>
					))}
				</select>
			</label>
			{showReverseButton && (
				<button
					className="stats-icon-button"
					type="button"
					aria-label="Reverse sort order"
					aria-pressed={isReversed}
					onClick={() => switchCallback(activeOption)}
				>
					<svg
						className="stats-icon-button-svg"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						aria-hidden="true"
					>
						{isReversed ? (
							<path d="M.998 7.19A.749.749 0 0 0 .47 8.47L7.99 16l7.522-7.53a.75.75 0 1 0-1.06-1.06L8.74 13.13V.75a.75.75 0 1 0-1.498 0v12.38L1.528 7.41a.749.749 0 0 0-.53-.22z" />
						) : (
							<path d="M.998 8.81A.749.749 0 0 1 .47 7.53L7.99 0l7.522 7.53a.75.75 0 1 1-1.06 1.06L8.74 2.87v12.38a.75.75 0 1 1-1.498 0V2.87L1.528 8.59a.751.751 0 0 1-.53.22z" />
						)}
					</svg>
				</button>
			)}
		</div>
	);
};

export default SortDropdownMenu;
