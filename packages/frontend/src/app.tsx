import { makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import { LiveStoreProvider } from '@livestore/react';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LiveStoreWorker from './livestore/livestore.worker?worker';
import { schema } from './livestore/schema';
import { GamePage } from './pages/game-page';
import { MenuPage } from './pages/menu-page';

const adapter = makePersistedAdapter({
	storage: { type: 'opfs' },
	worker: LiveStoreWorker,
	sharedWorker: LiveStoreSharedWorker,
});

export const App: React.FC = () => {
	return (
		<LiveStoreProvider
			schema={schema}
			adapter={adapter}
			renderLoading={(_) => <div>Loading LiveStore ({_.stage})...</div>}
			batchUpdates={(run) => run()}
			storeId="stargate-game-store"
			// syncPayload={{ authToken: 'insecure-token-change-me' }}
		>
			<Router>
				<Routes>
					<Route path="/game/:game_id" element={<GamePage />} />
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
