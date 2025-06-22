import React from 'react';
import { Alert } from 'react-bootstrap';

// Ship map component removed - focusing on Admin functionality only
// If ship functionality is needed later, it should use direct API calls instead of LiveStore

export const ShipMap: React.FC = () => {
	return (
		<Alert variant="info">
			<h6>Ship Map Unavailable</h6>
			<p>Ship map functionality has been removed to focus on Admin components.</p>
		</Alert>
	);
};
