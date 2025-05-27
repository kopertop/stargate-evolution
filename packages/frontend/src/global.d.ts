declare module '*?worker' {
	const WorkerFactory: new () => Worker;
	export default WorkerFactory;
}

declare module '*?sharedworker' {
	const SharedWorkerFactory: new () => SharedWorker;
	export default SharedWorkerFactory;
}
