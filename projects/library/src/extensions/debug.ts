export type LibraryDebugLevel = "info" | "warn" | "error";

export interface LibraryDebugLogEntry {
	id: number;
	level: LibraryDebugLevel;
	message: string;
	timestamp: number;
	meta?: unknown;
}

interface LibraryDebugSnapshot {
	logs: LibraryDebugLogEntry[];
}

const MAX_DEBUG_LOGS = 150;
const logs: LibraryDebugLogEntry[] = [];
const listeners = new Set<() => void>();
let nextId = 1;
let enabled = false;

const emit = () => {
	listeners.forEach((listener) => listener());
};

const attachGlobals = () => {
	if (typeof window === "undefined") return;
	(window as Window & { __libraryDebug?: typeof libraryDebug }).__libraryDebug = libraryDebug;
	if ((window as Window & { SpicetifyLibrary?: { debug?: typeof libraryDebug } }).SpicetifyLibrary) {
		(window as Window & { SpicetifyLibrary?: { debug?: typeof libraryDebug } }).SpicetifyLibrary!.debug = libraryDebug;
	}
};

const addLog = (level: LibraryDebugLevel, message: string, meta?: unknown) => {
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

export const libraryDebug = {
	log(level: LibraryDebugLevel, message: string, meta?: unknown) {
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
	clearLogs() {
		logs.length = 0;
		emit();
	},
	getSnapshot(): LibraryDebugSnapshot {
		return { logs: [...logs] };
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
			emit();
		}
	},
	isEnabled(): boolean {
		return enabled;
	},
};

attachGlobals();

const LIBRARY_DEBUG_KEY = "spicetify-library-debug";

const isDebugEnabled = (): boolean => {
	try {
		return localStorage.getItem(LIBRARY_DEBUG_KEY) === "true";
	} catch {
		return false;
	}
};

/**
 * Debug-gated logging wrapper.
 * Forwards to the in-app debug panel when debug logging is enabled.
 * Additionally logs to the browser console when localStorage key
 * "spicetify-library-debug" is set to "true".
 */
export const debugLog = (...args: unknown[]): void => {
	if (!enabled && !isDebugEnabled()) return;
	const message = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
	libraryDebug.info(message, args.length === 1 ? undefined : args);
	if (isDebugEnabled()) {
		console.log(...args);
	}
};
