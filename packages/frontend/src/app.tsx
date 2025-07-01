import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import {
	AdminLayout,
	AdminOverview,
	AdminCharacters,
	AdminMapBuilder,
	AdminUsers,
	AdminRooms,
	AdminTechnologies,
} from './pages/admin';
import { GamePage } from './pages/game-page';
import { MenuPage } from './pages/menu-page';

export const App: React.FC = () => {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<MenuPage />} />
				<Route path="/game" element={<GamePage />} />
				<Route path="/admin" element={<AdminLayout />}>
					<Route index element={<AdminOverview />} />
					<Route path="characters" element={<AdminCharacters />} />
					<Route path="map" element={<AdminMapBuilder />} />
					<Route path="users" element={<AdminUsers />} />
					<Route path="rooms" element={<AdminRooms />} />
					<Route path="technologies" element={<AdminTechnologies />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
			<ToastContainer
				position="bottom-right"
				theme="dark"
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
		</Router>
	);
};
