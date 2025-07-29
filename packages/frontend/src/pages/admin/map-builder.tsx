import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import { FaMap } from 'react-icons/fa';

import { RoomBuilder } from '../../components/room-builder';

import { AdminNavbar } from './admin-navbar';


const MENU_BAR_HEIGHT = 56;

export const AdminMapBuilder: React.FC = () => {
	const [selectedFloor, setSelectedFloor] = useState(0);

	const handleFloorChange = (floor: number) => {
		setSelectedFloor(floor);
	};

	return (
		<div className="admin-layout">
			{/* Fixed Menu Bar */}
			<div
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					width: '100%',
					height: MENU_BAR_HEIGHT,
					zIndex: 2000,
				}}
			>
				<AdminNavbar />
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
