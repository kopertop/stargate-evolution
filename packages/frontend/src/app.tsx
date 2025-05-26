import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, redirect } from 'react-router-dom';

import { GameStateProvider } from './contexts/game-state-context';
import { GamePage } from './pages/game-page';
import { MenuPage } from './pages/menu-page';

export const App: React.FC = () => {
	return (
		<GameStateProvider>
			<Router>
				<Routes>
					<Route path="/game/:gameId" element={<GamePage />} />
					<Route path="/" element={<MenuPage />} />
				</Routes>
			</Router>
		</GameStateProvider>
	);
};
