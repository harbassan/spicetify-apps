import React from "react";
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

const DebugConsole = () => {
	const [snapshot, setSnapshot] = React.useState(() => statsDebug.getSnapshot());
	const [open, setOpen] = React.useState(true);
	const [now, setNow] = React.useState(Date.now());

	React.useEffect(() => {
		setSnapshot(statsDebug.getSnapshot());
		return statsDebug.subscribe(() => setSnapshot(statsDebug.getSnapshot()));
	}, []);

	React.useEffect(() => {
		if (snapshot.activeRetries.length > 0) setOpen(true);
	}, [snapshot.activeRetries.length]);

	React.useEffect(() => {
		if (!open && snapshot.activeRetries.length === 0) return;
		const timer = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(timer);
	}, [open, snapshot.activeRetries.length]);

	const logs = [...snapshot.logs].reverse();

	return (
		<div className={`stats-debugConsole ${open ? "open" : "closed"}`}>
			<button className="stats-debugConsole-toggle" onClick={() => setOpen((value) => !value)} type="button">
				Debug Console{snapshot.activeRetries.length > 0 ? ` (${snapshot.activeRetries.length})` : ""}
			</button>
			{open && (
				<div className="stats-debugConsole-panel">
					<div className="stats-debugConsole-header">
						<div>
							<h3>Stats Debug Console</h3>
							<p>Retry logs and request diagnostics</p>
						</div>
						<button className="stats-debugConsole-clear" onClick={() => statsDebug.clearAll()} type="button">
							Clear
						</button>
					</div>

					<div className="stats-debugConsole-section">
						<div className="stats-debugConsole-sectionTitle">Active Retries</div>
						{snapshot.activeRetries.length === 0 ? (
							<div className="stats-debugConsole-empty">No active retries.</div>
						) : (
							snapshot.activeRetries.map((retry) => {
								const seconds = Math.max(0, Math.ceil((retry.retryAt - now) / 1000));
								return (
									<div className="stats-debugConsole-retry" key={retry.key}>
										<div className="stats-debugConsole-retryTitle">{retry.name}</div>
										<div>Attempt {retry.attempt}/{retry.maxRetries}</div>
										<div>Retry in {seconds}s</div>
										{retry.message && <div className="stats-debugConsole-retryMessage">{retry.message}</div>}
									</div>
								);
							})
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
