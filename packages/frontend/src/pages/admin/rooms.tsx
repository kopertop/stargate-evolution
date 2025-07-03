import React from 'react';
import { Alert } from 'react-bootstrap';
import { FaDoorOpen } from 'react-icons/fa';

export const AdminRooms: React.FC = () => {
	return (
		<div>
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h1>
					<FaDoorOpen className="me-2" />
					Room Templates
				</h1>
			</div>

			<Alert variant="info">
				<h5>Room Templates Management</h5>
				<p>This page will contain room template management functionality. For now, use the Map Builder to create and edit rooms.</p>
				<hr />
				<p className="mb-0">
					<a href="/admin/map" className="btn btn-primary">Go to Map Builder</a>
				</p>
			</Alert>
		</div>
	);
};