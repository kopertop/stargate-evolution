import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { GamePage } from './pages/game-page';
import { MenuPage } from './pages/menu-page';

export const App: React.FC = () => {
	return (
		<Router>
			<Routes>
				<Route path="/game/:gameId" element={<GamePage />} />
				<Route path="/" element={<MenuPage />} />
			</Routes>
		</Router>
	);
};
