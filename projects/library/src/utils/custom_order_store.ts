const STORAGE_KEY = "library:albums:custom-order";

class CustomOrderStore extends EventTarget {
	private order: string[] = []; // ordered URIs

	constructor() {
		super();
		this.load();
	}

	private load() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					this.order = parsed.filter((value) => typeof value === "string");
				} else {
					this.order = [];
				}
			}
		} catch {
			this.order = [];
		}
	}

	private save() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.order));
		} catch {
			// Ignore storage errors so UI can continue to function
		} finally {
			this.dispatchEvent(new Event("change"));
		}
	}

	/** Get the full ordered URI list */
	getOrder(): string[] {
		return [...this.order];
	}

	/** Replace the entire order */
	setOrder(uris: string[]): void {
		this.order = [...uris];
		this.save();
	}

	/** Sort a list of albums by the stored custom order.
	 *  Albums not in the stored order go to the end, preserving their relative input order. */
	sortByOrder<T extends { uri: string }>(items: T[]): T[] {
		const indexMap = new Map(this.order.map((uri, i) => [uri, i]));
		const known: T[] = [];
		const unknown: T[] = [];

		for (const item of items) {
			if (indexMap.has(item.uri)) {
				known.push(item);
			} else {
				unknown.push(item);
			}
		}

		known.sort((a, b) => (indexMap.get(a.uri) ?? 0) - (indexMap.get(b.uri) ?? 0));
		return [...known, ...unknown];
	}

	/** Reconcile stored order with current library contents.
	 *  Removes URIs no longer in the library, appends new URIs at the end.
	 *  Short-circuits if the resulting order is identical (no save/event). */
	reconcile(currentUris: string[]): void {
		// Don't create a default order just by viewing custom sort —
		// only reconcile when the user has explicitly saved an order
		if (this.order.length === 0) return;

		const currentSet = new Set(currentUris);
		const existingSet = new Set(this.order);

		// Remove stale URIs
		const pruned = this.order.filter((uri) => currentSet.has(uri));
		// Append new URIs
		const appended = currentUris.filter((uri) => !existingSet.has(uri));

		const newOrder = [...pruned, ...appended];

		// Short-circuit: skip save if order is unchanged
		if (newOrder.length === this.order.length && newOrder.every((uri, i) => uri === this.order[i])) {
			return;
		}

		this.order = newOrder;
		this.save();
	}

	/** Check if any custom order has been saved */
	hasOrder(): boolean {
		return this.order.length > 0;
	}
}

// Singleton
const store = new CustomOrderStore();
export default store;
