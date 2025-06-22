import React from 'react';
import { Alert } from 'react-bootstrap';

// Galaxy travel modal component removed - focusing on Admin functionality only
// If galaxy functionality is needed later, it should use direct API calls instead of LiveStore

export const GalaxyTravelModal: React.FC = () => {
	return (
		<Alert variant="info">
			<h6>Galaxy Travel Unavailable</h6>
			<p>Galaxy travel functionality has been removed to focus on Admin components.</p>
		</Alert>
	);
};
