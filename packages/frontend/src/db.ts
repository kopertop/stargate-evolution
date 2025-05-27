import { makePersistedAdapter } from '@livestore/adapter-web';
import { createStorePromise } from '@stargate/db';
import { stargateSchema } from '@stargate/db/livestore-schemas';

import LiveStoreSharedWorker from './workers/livestore-shared.worker?sharedworker';
import LiveStoreWorker from './workers/livestore.worker?worker';

const adapter = makePersistedAdapter({
	worker: LiveStoreWorker,
	sharedWorker: LiveStoreSharedWorker,
	storage: { type: 'opfs' },
});

export const dbPromise = createStorePromise({
	schema: stargateSchema as any, // TODO: Use correct type if available
	adapter,
	storeId: 'stargate_evolution',
});
