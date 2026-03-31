import React from "react";
import { libraryDebug } from "../extensions/debug";

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

const DebugConsole = () => {
	const [snapshot, setSnapshot] = React.useState(() => libraryDebug.getSnapshot());
	const [open, setOpen] = React.useState(false);

	const syncState = React.useCallback(() => {
		setSnapshot(libraryDebug.getSnapshot());
	}, []);

	React.useEffect(() => {
		syncState();
		return libraryDebug.subscribe(syncState);
	}, [syncState]);

	const logs = [...snapshot.logs].reverse();

	const toggleOpen = () => setOpen((v) => !v);

	return (
		<div className={`stats-debugConsole ${open ? "open" : "closed"}`}>
			{!open && (
				<button className="stats-debugConsole-toggle" onClick={toggleOpen} type="button">
					Debug Console
				</button>
			)}
			{open && (
				<div className="stats-debugConsole-panel">
					<div className="stats-debugConsole-header">
						<div>
							<h3>Library Debug Console</h3>
							<p>API calls, component rendering, and diagnostics</p>
						</div>
						<div className="stats-debugConsole-headerButtons">
							<button className="stats-debugConsole-clear" onClick={() => libraryDebug.clearLogs()} type="button">
								Clear Logs
							</button>
							<button className="stats-debugConsole-close" onClick={toggleOpen} type="button" aria-label="Close debug console">
								✕
							</button>
						</div>
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
