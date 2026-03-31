import React from "react";
import { getCacheDiagnostics } from "../extensions/cache";
import { statsDebug } from "../extensions/debug";

const formatMeta = (meta: unknown) => {
	if (meta === undefined) return "";
	try {
		return JSON.stringify(meta, null, 2);
	} catch {
		return String(meta);
	}
};

const formatTime = (timestamp: number) => {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
};

const formatAge = (ms: number) => {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
	if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
	return `${Math.round(ms / 3_600_000)}h`;
};

const DebugConsole = () => {
	const [snapshot, setSnapshot] = React.useState(() => statsDebug.getSnapshot());
	const [open, setOpen] = React.useState(false);
	const [now, setNow] = React.useState(Date.now());
	const [cacheDiagnostics, setCacheDiagnostics] = React.useState(() => getCacheDiagnostics());
	const [dismissedActiveWork, setDismissedActiveWork] = React.useState(false);
	const previousActivityCount = React.useRef(snapshot.activities.length);

	const syncState = React.useCallback(() => {
		setSnapshot(statsDebug.getSnapshot());
		setCacheDiagnostics(getCacheDiagnostics());
	}, []);

	React.useEffect(() => {
		syncState();
		return statsDebug.subscribe(syncState);
	}, [syncState]);

	React.useEffect(() => {
		const currentActivityCount = snapshot.activities.length;
		const hadActivities = previousActivityCount.current > 0;

		if (currentActivityCount === 0) {
			setDismissedActiveWork(false);
		} else if (!hadActivities && !dismissedActiveWork) {
			setOpen(true);
		}

		previousActivityCount.current = currentActivityCount;
	}, [dismissedActiveWork, snapshot.activities.length]);

	React.useEffect(() => {
		if (!open && snapshot.activities.length === 0) return;
		const timer = window.setInterval(() => {
			setNow(Date.now());
			setCacheDiagnostics(getCacheDiagnostics());
		}, 1000);
		return () => window.clearInterval(timer);
	}, [open, snapshot.activities.length]);

	const logs = [...snapshot.logs].reverse();
	const visibleCacheDiagnostics = cacheDiagnostics.slice(0, 12);

	const toggleOpen = () => {
		setOpen((value) => {
			const nextValue = !value;
			if (!nextValue && snapshot.activities.length > 0) {
				setDismissedActiveWork(true);
			}
			if (nextValue) {
				setDismissedActiveWork(false);
			}
			return nextValue;
		});
	};

	return (
		<div className={`stats-debugConsole ${open ? "open" : "closed"}`}>
			{!open && (
				<button className="stats-debugConsole-toggle" onClick={toggleOpen} type="button">
					Debug Console{snapshot.activities.length > 0 ? ` (${snapshot.activities.length})` : ""}
				</button>
			)}
			{open && (
				<div className="stats-debugConsole-panel">
					<div className="stats-debugConsole-header">
						<div>
							<h3>Stats Debug Console</h3>
							<p>Request logs, delayed enrichment work, and cache diagnostics</p>
						</div>
						<div className="stats-debugConsole-headerButtons">
							<button className="stats-debugConsole-clear" onClick={() => statsDebug.clearLogs()} type="button">
								Clear Logs
							</button>
							<button className="stats-debugConsole-close" onClick={toggleOpen} type="button" aria-label="Close debug console">
								✕
							</button>
						</div>
					</div>

					<div className="stats-debugConsole-section">
						<div className="stats-debugConsole-sectionTitle">Active Delays</div>
						{snapshot.activities.length === 0 ? (
							<div className="stats-debugConsole-empty">No delayed work right now.</div>
						) : (
							snapshot.activities.map((activity) => {
								const seconds = Math.max(0, Math.ceil((activity.until - now) / 1000));
								return (
									<div className="stats-debugConsole-retry" key={activity.key}>
										<div className="stats-debugConsole-retryTitle">{activity.title}</div>
										<div>{activity.kind === "suppression" ? "Suppressed" : "Queued"}</div>
										<div>{seconds}s remaining</div>
										{activity.detail && <div className="stats-debugConsole-retryMessage">{activity.detail}</div>}
									</div>
								);
							})
						)}
					</div>

					<div className="stats-debugConsole-section">
						<div className="stats-debugConsole-sectionTitle">Cache Diagnostics</div>
						{visibleCacheDiagnostics.length === 0 ? (
							<div className="stats-debugConsole-empty">No cache entries yet.</div>
						) : (
							<div className="stats-debugConsole-cacheList">
								{visibleCacheDiagnostics.map((entry) => (
									<div className={`stats-debugConsole-cache ${entry.status}`} key={`${entry.status}:${entry.key}`}>
										<div className="stats-debugConsole-cacheHeader">
											<span className="stats-debugConsole-cacheKey">{entry.key}</span>
											<span>{entry.status === "fresh" ? "Active" : "Stale"}</span>
										</div>
										<div>Age: {formatAge(entry.ageMs)}</div>
										<div>Last used: {formatAge(entry.idleMs)} ago</div>
										<div>Hits: {entry.hits}</div>
										{entry.reason && <div className="stats-debugConsole-retryMessage">{entry.reason}</div>}
									</div>
								))}
							</div>
						)}
					</div>

					<div className="stats-debugConsole-section">
						<div className="stats-debugConsole-sectionTitle">Recent Logs</div>
						<div className="stats-debugConsole-logList">
							{logs.length === 0 ? (
								<div className="stats-debugConsole-empty">No logs yet.</div>
							) : (
								logs.map((entry) => (
									<div className={`stats-debugConsole-log ${entry.level}`} key={entry.id}>
										<div className="stats-debugConsole-logHeader">
											<span className="stats-debugConsole-level">{entry.level.toUpperCase()}</span>
											<span>{formatTime(entry.timestamp)}</span>
										</div>
										<div className="stats-debugConsole-message">{entry.message}</div>
										{entry.meta !== undefined && (
											<pre className="stats-debugConsole-meta">{formatMeta(entry.meta)}</pre>
										)}
									</div>
								))
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default DebugConsole;