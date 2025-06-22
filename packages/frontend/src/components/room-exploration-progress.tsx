import React from 'react';
import { Alert } from 'react-bootstrap';

// Room exploration progress component removed - focusing on Admin functionality only
// If room exploration functionality is needed later, it should use direct API calls instead of LiveStore

export const RoomExplorationProgress: React.FC = () => {
	return (
		<Alert variant="info">
			<h6>Room Exploration Unavailable</h6>
			<p>Room exploration functionality has been removed to focus on Admin components.</p>
		</Alert>
	);
};
