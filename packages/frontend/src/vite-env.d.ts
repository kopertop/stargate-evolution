/// <reference types="vite/client" />

declare module '*?worker' {
	const workerConstructor: {
		new (): Worker;
	};
	export default workerConstructor;
}

declare module '*?sharedworker' {
	const sharedWorkerConstructor: {
		new (): SharedWorker;
	};
	export default sharedWorkerConstructor;
}
