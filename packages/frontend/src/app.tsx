import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { AdminPage } from './pages/admin-page';
import { MenuPage } from './pages/menu-page';

export const App: React.FC = () => {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<MenuPage />} />
				<Route path="/admin" element={<AdminPage />} />
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
