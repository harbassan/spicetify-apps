import { statsDebug } from "./debug";

type OptionalEnrichmentTask<T> = {
	key: string;
	label: string;
	task: () => Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
};

const STARTUP_DELAY_MS = 1500;
const REQUEST_GAP_MS = 350;
const MAX_CONCURRENT_TASKS = 1;

const queue: OptionalEnrichmentTask<unknown>[] = [];
const pendingByKey = new Map<string, Promise<unknown>>();

let activeTasks = 0;
let nextAvailableAt = Date.now() + STARTUP_DELAY_MS;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const runNext = () => {
	while (activeTasks < MAX_CONCURRENT_TASKS && queue.length > 0) {
		const task = queue.shift() as OptionalEnrichmentTask<unknown>;
		activeTasks += 1;
		void (async () => {
			const activityKey = `queue:${task.key}`;
			const waitUntil = Math.max(nextAvailableAt, Date.now());
			if (waitUntil > Date.now()) {
				statsDebug.setActivity({
					key: activityKey,
					kind: "queue",
					title: task.label,
					detail: "Optional enrichment is being delayed to keep core data requests responsive.",
					until: waitUntil,
					createdAt: Date.now(),
				});
				await sleep(waitUntil - Date.now());
			}

			statsDebug.clearActivity(activityKey);
			statsDebug.info("Running optional enrichment request", { key: task.key, label: task.label });

			try {
				const result = await task.task();
				task.resolve(result);
			} catch (error) {
				statsDebug.warn("Optional enrichment request failed", {
					key: task.key,
					label: task.label,
					error: error instanceof Error ? error.message : String(error),
				});
				task.reject(error);
			} finally {
				pendingByKey.delete(task.key);
				activeTasks -= 1;
				nextAvailableAt = Date.now() + REQUEST_GAP_MS;
				runNext();
			}
		})();
	}
};

export const runOptionalEnrichment = <T,>(options: {
	key: string;
	label: string;
	task: () => Promise<T>;
}): Promise<T> => {
	const existing = pendingByKey.get(options.key);
	if (existing) return existing as Promise<T>;

	const promise = new Promise<T>((resolve, reject) => {
		queue.push({ ...options, resolve, reject });
	});

	pendingByKey.set(options.key, promise);
	statsDebug.info("Queued optional enrichment request", {
		key: options.key,
		label: options.label,
		queuedItems: queue.length,
	});
	runNext();
	return promise;
};