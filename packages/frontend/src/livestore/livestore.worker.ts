import { makeWorker } from '@livestore/adapter-web/worker';
// import { makeCfSync } from '@livestore/sync-cf';

import { schema } from './schema';

makeWorker({
	schema,
	// Temporarily disabled sync to test LiveStore locally
	// sync: {
	// 	backend: makeCfSync({ url: import.meta.env.VITE_LIVESTORE_SYNC_URL || 'http://localhost:8788' }),
	// 	initialSyncOptions: { _tag: 'Blocking', timeout: 5000 },
	// },
});
