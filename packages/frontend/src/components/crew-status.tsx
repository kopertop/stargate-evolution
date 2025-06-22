import React from 'react';
import { Alert } from 'react-bootstrap';

// Crew status component removed - focusing on Admin functionality only
// If crew functionality is needed later, it should use direct API calls instead of LiveStore

export const CrewStatus: React.FC = () => {
	return (
		<Alert variant="info">
			<h6>Crew Status Unavailable</h6>
			<p>Crew functionality has been removed to focus on Admin components.</p>
		</Alert>
	);
};
