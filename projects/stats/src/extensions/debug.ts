export type StatsDebugLevel = "info" | "warn" | "error";

export interface StatsDebugLogEntry {
	id: number;
	level: StatsDebugLevel;
	message: string;
	timestamp: number;
	meta?: unknown;
}

export interface StatsRetryEntry {
	key: string;
	name: string;
	url: string;
	attempt: number;
	maxRetries: number;
	delayMs: number;
	retryAt: number;
	message?: string;
}

interface StatsDebugSnapshot {
	logs: StatsDebugLogEntry[];
	activeRetries: StatsRetryEntry[];
}

const MAX_DEBUG_LOGS = 150;
const logs: StatsDebugLogEntry[] = [];
const activeRetries = new Map<string, StatsRetryEntry>();
const listeners = new Set<() => void>();
let nextId = 1;

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
	setRetry(entry: StatsRetryEntry) {
		activeRetries.set(entry.key, entry);
		attachGlobals();
		emit();
	},
	clearRetry(key: string) {
		if (!activeRetries.has(key)) return;
		activeRetries.delete(key);
		emit();
	},
	clearAll() {
		logs.length = 0;
		activeRetries.clear();
		emit();
	},
	getSnapshot(): StatsDebugSnapshot {
		return {
			logs: [...logs],
			activeRetries: [...activeRetries.values()].sort((a, b) => a.retryAt - b.retryAt),
		};
	},
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
};

attachGlobals();

declare global {
	interface Window {
		__statsDebug?: typeof statsDebug;
	}
}
