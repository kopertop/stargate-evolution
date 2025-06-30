import React from 'react';
import { Alert } from 'react-bootstrap';
import { FaToolbox } from 'react-icons/fa';

export const AdminTechnologies: React.FC = () => {
	return (
		<div>
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h1>
					<FaToolbox className="me-2" />
					Technology Templates
				</h1>
			</div>

			<Alert variant="info">
				<h5>Technology Templates Management</h5>
				<p>This page will contain technology template management functionality including CRUD operations for technologies and room technology assignments.</p>
				<hr />
				<p className="mb-0">Coming soon...</p>
			</Alert>
		</div>
	);
};