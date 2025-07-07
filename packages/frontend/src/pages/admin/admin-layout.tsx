import React from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { FaUsers, FaGamepad, FaCog, FaMap, FaRobot, FaDoorOpen, FaToolbox, FaDatabase, FaCouch } from 'react-icons/fa';
import { Outlet, useLocation, useNavigate } from 'react-router';

export const AdminLayout: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();

	const navItems = [
		{ path: '/admin', label: 'Overview', icon: <FaCog /> },
		{ path: '/admin/map', label: 'Map Builder', icon: <FaMap /> },
		{ path: '/admin/users', label: 'Users', icon: <FaUsers /> },
		{ path: '/admin/characters', label: 'Characters', icon: <FaRobot /> },
		{ path: '/admin/rooms', label: 'Room Templates', icon: <FaDoorOpen /> },
		{ path: '/admin/furniture-templates', label: 'Furniture Templates', icon: <FaCouch /> },
		{ path: '/admin/technologies', label: 'Technologies', icon: <FaToolbox /> },
		{ path: '/admin/sql-debug', label: 'SQL Debug', icon: <FaDatabase /> },
	];

	const isActive = (path: string) => {
		if (path === '/admin') {
			return location.pathname === '/admin';
		}
		return location.pathname.startsWith(path);
	};

	return (
		<div className="admin-layout">
			<Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
				<Container fluid>
					<Navbar.Brand onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>
						<FaGamepad className="me-2" />
						Stargate Evolution Admin
					</Navbar.Brand>
					<Nav className="me-auto">
						{navItems.map((item) => (
							<Nav.Link
								key={item.path}
								onClick={() => navigate(item.path)}
								className={isActive(item.path) ? 'active' : ''}
								style={{ cursor: 'pointer' }}
							>
								{item.icon}
								<span className="ms-2">{item.label}</span>
							</Nav.Link>
						))}
					</Nav>
					<Nav>
						<Nav.Link onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
							Back to Game
						</Nav.Link>
					</Nav>
				</Container>
			</Navbar>

			<Container fluid>
				<Outlet />
			</Container>
		</div>
	);
};
