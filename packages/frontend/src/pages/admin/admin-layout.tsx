import React from 'react';
import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router';

import { AdminNavbar } from './admin-navbar';

export const AdminLayout: React.FC = () => {

	return (
		<div className="admin-layout">
			<AdminNavbar />

			<Container fluid>
				<Outlet />
			</Container>
		</div>
	);
};
