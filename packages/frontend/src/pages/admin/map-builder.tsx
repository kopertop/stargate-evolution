import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import { FaMap } from 'react-icons/fa';
import { useNavigate } from 'react-router';

import { RoomBuilder } from '../../components/room-builder';

const MENU_BAR_HEIGHT = 56;

export const AdminMapBuilder: React.FC = () => {
	const [selectedFloor, setSelectedFloor] = useState(0);
	const navigate = useNavigate();

	const handleFloorChange = (floor: number) => {
		setSelectedFloor(floor);
	};

	return (
		<div style={{ position: 'relative', minHeight: '100vh', background: '#181a28' }}>
			{/* Fixed Menu Bar */}
			<div
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					width: '100%',
					height: MENU_BAR_HEIGHT,
					background: '#222',
					color: '#fff',
					display: 'flex',
					alignItems: 'center',
					zIndex: 2000,
					boxShadow: '0 2px 8px #000a',
					padding: '0 2rem',
				}}
			>
				<span style={{ fontWeight: 700, marginRight: 32, fontSize: 18, cursor: 'pointer' }} onClick={() => navigate('/admin')}>
					Stargate Evolution Admin
				</span>
				<a style={{ color: '#fff', marginRight: 24, textDecoration: 'none', cursor: 'pointer' }} onClick={() => navigate('/admin')}>Overview</a>
				<a style={{ color: '#fff', marginRight: 24, textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/admin/map')}>Map Builder</a>
				<a style={{ color: '#fff', marginRight: 24, textDecoration: 'none', cursor: 'pointer' }} onClick={() => navigate('/admin/users')}>Users</a>
				<a style={{ color: '#fff', marginRight: 24, textDecoration: 'none', cursor: 'pointer' }} onClick={() => navigate('/admin/characters')}>Characters</a>
				<a style={{ color: '#fff', marginRight: 24, textDecoration: 'none', cursor: 'pointer' }} onClick={() => navigate('/admin/rooms')}>Room Templates</a>
				<a style={{ color: '#fff', marginRight: 24, textDecoration: 'none', cursor: 'pointer' }} onClick={() => navigate('/admin/technologies')}>Technologies</a>
				<div style={{ flex: 1 }} />
				<a style={{ color: '#fff', textDecoration: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/')}>Back to Game</a>
			</div>

			{/* Content below menu bar, add top margin to avoid overlap */}
			<div style={{ marginTop: MENU_BAR_HEIGHT + 16 }}>
				<div className="d-flex justify-content-between align-items-center mb-4">
					<h1>
						<FaMap className="me-2" />
						Map Builder
					</h1>
				</div>

				<Card>
					<Card.Body className="p-0">
						<RoomBuilder
							selectedFloor={selectedFloor}
							onFloorChange={handleFloorChange}
						/>
					</Card.Body>
				</Card>
			</div>
		</div>
	);
};
