import React, { useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Outlet, useLocation } from 'react-router';

import { AdminNavbar } from './admin-navbar';

export const AdminLayout: React.FC = () => {
	const location = useLocation();
	const isMapBuilder = location.pathname === '/admin/map';

	// Add/remove admin-page class to body for proper scrolling
	useEffect(() => {
		if (!isMapBuilder) {
			document.body.classList.add('admin-page');
		} else {
			document.body.classList.remove('admin-page');
		}

		// Cleanup when leaving admin section
		return () => {
			document.body.classList.remove('admin-page');
		};
	}, [isMapBuilder]);

	// Map Builder handles its own layout with fixed positioning
	if (isMapBuilder) {
		return <Outlet />;
	}

	return (
		<div className="admin-layout" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<AdminNavbar />

			<Container fluid style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
				<Outlet />
			</Container>
		</div>
	);
};
