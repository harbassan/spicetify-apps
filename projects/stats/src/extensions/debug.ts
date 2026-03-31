export type StatsDebugLevel = "info" | "warn" | "error";

export interface StatsDebugLogEntry {
	id: number;
	level: StatsDebugLevel;
	message: string;
	timestamp: number;
	meta?: unknown;
}

export interface StatsDebugActivityEntry {
	key: string;
	kind: "queue" | "suppression";
	title: string;
	detail?: string;
	until: number;
	createdAt: number;
}

interface StatsDebugSnapshot {
	logs: StatsDebugLogEntry[];
	activities: StatsDebugActivityEntry[];
}

const MAX_DEBUG_LOGS = 150;
const logs: StatsDebugLogEntry[] = [];
const activities = new Map<string, StatsDebugActivityEntry>();
const listeners = new Set<() => void>();
let nextId = 1;
let enabled = false;

const emit = () => {
	listeners.forEach((listener) => listener());
};

const attachGlobals = () => {
	if (typeof window === "undefined") return;
	(window as Window & { __statsDebug?: typeof statsDebug }).__statsDebug = statsDebug;
	if ((window as Window & { SpicetifyStats?: { debug?: typeof statsDebug } }).SpicetifyStats) {
		(window as Window & { SpicetifyStats?: { debug?: typeof statsDebug } }).SpicetifyStats!.debug = statsDebug;
	}
};

const addLog = (level: StatsDebugLevel, message: string, meta?: unknown) => {
	if (!enabled) return;
	logs.push({
		id: nextId++,
		level,
		message,
		timestamp: Date.now(),
		meta,
	});
	if (logs.length > MAX_DEBUG_LOGS) logs.splice(0, logs.length - MAX_DEBUG_LOGS);
	attachGlobals();
	emit();
};

export const statsDebug = {
	log(level: StatsDebugLevel, message: string, meta?: unknown) {
		addLog(level, message, meta);
	},
	info(message: string, meta?: unknown) {
		addLog("info", message, meta);
	},
	warn(message: string, meta?: unknown) {
		addLog("warn", message, meta);
	},
	error(message: string, meta?: unknown) {
		addLog("error", message, meta);
	},
	setActivity(entry: StatsDebugActivityEntry) {
		if (!enabled) return;
		activities.set(entry.key, entry);
		attachGlobals();
		emit();
	},
	clearActivity(key: string) {
		if (!activities.has(key)) return;
		activities.delete(key);
		emit();
	},
	clearLogs() {
		logs.length = 0;
		emit();
	},
	getSnapshot(): StatsDebugSnapshot {
		return {
			logs: [...logs],
			activities: [...activities.values()].sort((left, right) => left.until - right.until),
		};
	},
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	setEnabled(value: boolean) {
		enabled = value;
		if (!value) {
			logs.length = 0;
			activities.clear();
			emit();
		}
	},
	isEnabled(): boolean {
		return enabled;
	},
};

attachGlobals();

const STATS_DEBUG_KEY = "spicetify-stats-debug";

const isDebugEnabled = (): boolean => {
	try {
		return localStorage.getItem(STATS_DEBUG_KEY) === "true";
	} catch {
		return false;
	}
};

/**
 * Debug-gated logging wrapper.
 * Forwards to the in-app debug panel when debug logging is enabled.
 * Additionally logs to the browser console when localStorage key
 * "spicetify-stats-debug" is set to "true".
 */
export const debugLog = (...args: unknown[]): void => {
	if (!enabled && !isDebugEnabled()) return;
	const message = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
	statsDebug.info(message, args.length === 1 ? undefined : args);
	if (isDebugEnabled()) {
		console.log(...args);
	}
};

declare global {
	interface Window {
		__statsDebug?: typeof statsDebug;
	}
}