import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { GamePage } from './pages/game-page';
import { MenuPage } from './pages/menu-page';

export const App: React.FC = () => {
	return (
		<Router>
			<Routes>
				<Route path="/game/:gameId" element={<GamePage />} />
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
	);
};
