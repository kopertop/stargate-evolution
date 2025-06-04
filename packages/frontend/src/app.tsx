import { makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import { BootStatus } from '@livestore/livestore';
import { LiveStoreProvider } from '@livestore/react';
import React from 'react';
import { Button } from 'react-bootstrap';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LiveStoreWorker from './livestore/livestore.worker?worker';
import { schema } from './livestore/schema';
import { AdminPage } from './pages/admin-page';
import { GamePage } from './pages/game-page';
import { MenuPage } from './pages/menu-page';

const adapter = makePersistedAdapter({
	storage: { type: 'opfs' },
	worker: LiveStoreWorker,
	sharedWorker: LiveStoreSharedWorker,
});

// ... existing code ...
const renderLoadingView = (_: BootStatus) => (
	<div
		style={{ minHeight: '100vh' }}
		className="d-flex flex-column justify-content-center align-items-center w-100"
	>
		<div className="spinner-border text-primary" role="status">
			<span className="visually-hidden">Loading...</span>
		</div>
		<p className="mt-2">Loading LiveStore...</p>
		<Button onClick={async () => {
			const cleared: string[] = [];
			if ('storage' in navigator && navigator.storage && navigator.storage.getDirectory) {
				try {
					const root = await navigator.storage.getDirectory() as any;
					for await (const [name] of root.entries()) {
						await root.removeEntry(name, { recursive: true });
						cleared.push(name);
					}
					console.log(`All OPFS data cleared: [${cleared.join(', ')}]. Reloading...`);
					toast.success('All OPFS data cleared. Reloading...');
				} catch (e: any) {
					console.error('Failed to clear OPFS data: ' + (e?.message || e));
					toast.error('Failed to clear OPFS data: ' + (e?.message || e));
				}
				setTimeout(() => window.location.reload(), 1000);
			} else {
				console.log('OPFS not supported in this browser');
				toast.warn('OPFS not supported in this browser');
			}
		}}>Clear LiveStore</Button>
	</div>
);

export const App: React.FC = () => {
	return (
		<LiveStoreProvider
			schema={schema}
			adapter={adapter}
			renderLoading={renderLoadingView}
			batchUpdates={(run) => run()}
			storeId="stargate-game-store"
			// syncPayload={{ authToken: 'insecure-token-change-me' }}
		>
			<Router>
				<Routes>
					<Route path="/game/:game_id" element={<GamePage />} />
					<Route path="/admin" element={<AdminPage />} />
					<Route path="/" element={<MenuPage />} />
				</Routes>
				<ToastContainer
					position="top-center"
					autoClose={4000}
					hideProgressBar={false}
					newestOnTop={false}
					closeOnClick
					rtl={false}
					pauseOnFocusLoss
					draggable
					pauseOnHover
					theme="dark"
				/>
			</Router>
		</LiveStoreProvider>
	);
};
