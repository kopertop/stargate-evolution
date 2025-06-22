import React from 'react';
import { Button, Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Game page removed - focusing on Admin functionality only
// If game functionality is needed later, it should use direct API calls instead of LiveStore

export const GamePage: React.FC = () => {
	const navigate = useNavigate();

	return (
		<Container className="mt-4">
			<Alert variant="info">
				<h4>Game Functionality Removed</h4>
				<p>
					The game functionality has been removed to focus on Admin components only.
					Please use the Admin panel to manage room templates, doors, and other game data.
				</p>
				<Button variant="primary" onClick={() => navigate('/admin')}>
					Go to Admin Panel
				</Button>
			</Alert>
		</Container>
	);
};
