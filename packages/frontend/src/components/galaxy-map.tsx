import React from 'react';
import { Alert } from 'react-bootstrap';

// Galaxy map component removed - focusing on Admin functionality only
// If galaxy functionality is needed later, it should use direct API calls instead of LiveStore

export const GalaxyMap: React.FC = () => {
	return (
		<Alert variant="info">
			<h6>Galaxy Map Unavailable</h6>
			<p>Galaxy map functionality has been removed to focus on Admin components.</p>
		</Alert>
	);
};
