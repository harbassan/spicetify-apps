import React from "react";

interface ReorderItem {
	uri: string;
	name: string;
	artist: string;
	imageUrl?: string;
}

interface ReorderModalProps {
	items: ReorderItem[];
	onSave: (uris: string[]) => void;
	onReset?: () => void;
}

const ReorderModal = ({ items: initialItems, onSave, onReset }: ReorderModalProps) => {
	const [items, setItems] = React.useState(initialItems);
	const dragIndexRef = React.useRef<number | null>(null);
	const dropTargetRef = React.useRef<number | null>(null);
	const [dropTarget, setDropTarget] = React.useState<number | null>(null);
	const rowRefs = React.useRef<(HTMLDivElement | null)[]>([]);
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const itemsRef = React.useRef(items);
	itemsRef.current = items;

	// Inject a save icon button into the PopupModal title bar
	React.useEffect(() => {
		const modal = containerRef.current?.closest(".GenericModal");
		if (!modal) return;
		const header = modal.querySelector(".main-trackCreditsModal-header") ?? modal.querySelector("header");
		if (!header) return;

		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "reorder-modal-header-save";
		btn.title = "Save Order";
		btn.setAttribute("aria-label", "Save Order");
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("width", "18");
		svg.setAttribute("height", "18");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("fill", "currentColor");
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", "M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10v4z");
		svg.appendChild(path);
		btn.appendChild(svg);
		btn.addEventListener("click", () => {
			const uris = itemsRef.current.map((item) => item.uri);
			onSave(uris);
			Spicetify.PopupModal.hide?.();
		});

		// Insert before the close button
		const closeBtn =
			header.querySelector(".main-trackCreditsModal-closeBtn") ??
			header.querySelector('button[aria-label="Close"]') ??
			header.querySelector('button[aria-label="Close modal"]');
		if (closeBtn) {
			header.insertBefore(btn, closeBtn);
		} else {
			header.appendChild(btn);
		}

		return () => { btn.remove(); };
	}, [onSave]);

	// Close modal on Escape key
	React.useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				Spicetify.PopupModal.hide?.();
			}
		};
		document.addEventListener("keydown", handleEsc);
		return () => { document.removeEventListener("keydown", handleEsc); };
	}, []);

	const moveItem = (fromIndex: number, toIndex: number) => {
		if (toIndex < 0 || toIndex >= items.length) return;
		setItems((prev) => {
			const updated = [...prev];
			const [moved] = updated.splice(fromIndex, 1);
			updated.splice(toIndex, 0, moved);
			return updated;
		});
		// Focus the moved item at its new position after render
		requestAnimationFrame(() => {
			rowRefs.current[toIndex]?.focus();
		});
	};

	const handleKeyDown = (index: number) => (e: React.KeyboardEvent) => {
		if (e.key === "ArrowUp" && index > 0) {
			e.preventDefault();
			moveItem(index, index - 1);
		} else if (e.key === "ArrowDown" && index < items.length - 1) {
			e.preventDefault();
			moveItem(index, index + 1);
		}
	};

	const handleDragStart = (index: number) => (e: React.DragEvent) => {
		dragIndexRef.current = index;
		e.dataTransfer.effectAllowed = "move";
		// Some browsers (Firefox) require a non-empty payload for drag to start
		e.dataTransfer.setData("text/plain", items[index]?.uri || "");
	};

	const handleDragOver = (index: number) => (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		if (dropTargetRef.current !== index) {
			dropTargetRef.current = index;
			setDropTarget(index);
		}
	};

	const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
		e.preventDefault();
		const sourceIndex = dragIndexRef.current;
		if (sourceIndex !== null && sourceIndex !== targetIndex) {
			// When dragging downward, splice(fromIndex, 1) shifts later indices
			// down by 1, so decrement targetIndex to land before the drop target
			// (matching the border-top visual indicator).
			const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
			moveItem(sourceIndex, adjustedTarget);
		}
		dragIndexRef.current = null;
		dropTargetRef.current = null;
		setDropTarget(null);
	};

	const handleDragEnd = () => {
		dragIndexRef.current = null;
		dropTargetRef.current = null;
		setDropTarget(null);
	};

	const handleSave = () => {
		onSave(items.map((item) => item.uri));
		Spicetify.PopupModal.hide?.();
	};

	const handleReset = () => {
		onReset?.();
		Spicetify.PopupModal.hide?.();
	};

	return (
		<div className="reorder-modal" ref={containerRef}>
			<div className="reorder-modal-list" role="list" aria-label="Album order">
				{items.map((item, index) => (
					<div
						key={item.uri}
						ref={(el) => { rowRefs.current[index] = el; }}
						className={`reorder-modal-row ${dropTarget === index ? "reorder-drop-target" : ""}`}
						draggable
						tabIndex={0}
						role="listitem"
						aria-label={`${item.name} by ${item.artist}, position ${index + 1} of ${items.length}. Use arrow keys to reorder.`}
						onDragStart={handleDragStart(index)}
						onDragOver={handleDragOver(index)}
						onDrop={handleDrop(index)}
						onDragEnd={handleDragEnd}
						onKeyDown={handleKeyDown(index)}
					>
						<span className="reorder-modal-drag-handle">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
								<path d="M2 4h12v1.5H2zM2 7.25h12v1.5H2zM2 10.5h12v1.5H2z" />
							</svg>
						</span>
						{item.imageUrl && (
							<img
								className="reorder-modal-image"
								src={item.imageUrl}
								alt=""
								width={32}
								height={32}
							/>
						)}
						<span className="reorder-modal-name">{item.name}</span>
						<span className="reorder-modal-artist">{item.artist}</span>
					</div>
				))}
			</div>
			<div className="reorder-modal-actions">
				<button type="button" className="reorder-modal-save" onClick={handleSave}>
					Save Order
				</button>
				{onReset && (
					<button type="button" className="reorder-modal-reset" onClick={handleReset}>
						Reset to Default
					</button>
				)}
			</div>
		</div>
	);
};

export default ReorderModal;
