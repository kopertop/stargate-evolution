import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { GamePage } from './pages/game-page';

export const App: React.FC = () => {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<GamePage />} />
			</Routes>
		</Router>
	);
}
