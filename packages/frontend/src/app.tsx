import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { MobileGuard } from './components/mobile-guard';
import { PWARouter } from './components/pwa-router';
import { AuthProvider } from './contexts/auth-context';
import { GameStateProvider } from './contexts/game-state-context';
import {
	AdminLayout,
	AdminOverview,
	AdminCharacters,
	AdminMapBuilder,
	AdminUsers,
	AdminDoors,
	AdminRoomTemplates,
	AdminTechnologies,
	SqlDebugPage,
	FurnitureTemplatesAdmin,
} from './pages/admin';
import { GamePage } from './pages/game-page';
import { MenuPage } from './pages/menu-page';

export const App: React.FC = () => {
	// Note: Automatic fullscreen removed due to browser security restrictions
	// Users can manually enter fullscreen using F11 or browser controls

	return (
		<AuthProvider>
			<GameStateProvider>
				<PWARouter>
					<Routes>
						<Route path="/" element={<MenuPage />} />
						<Route path="/game/:id" element={<GamePage />} />
						<Route path="/admin" element={
							<MobileGuard message="Admin panel is not available on mobile devices">
								<AdminLayout />
							</MobileGuard>
						}>
							<Route index element={<AdminOverview />} />
							<Route path="characters" element={<AdminCharacters />} />
							<Route path="map" element={<AdminMapBuilder />} />
							<Route path="users" element={<AdminUsers />} />
							<Route path="doors" element={<AdminDoors />} />
							<Route path="room-templates" element={<AdminRoomTemplates />} />
							<Route path="furniture-templates" element={<FurnitureTemplatesAdmin />} />
							<Route path="technologies" element={<AdminTechnologies />} />
							<Route path="sql-debug" element={<SqlDebugPage />} />
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
				</PWARouter>
			</GameStateProvider>
		</AuthProvider>
	);
};
