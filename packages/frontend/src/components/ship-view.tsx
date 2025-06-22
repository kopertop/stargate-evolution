import React from 'react';
import { Alert } from 'react-bootstrap';

// Ship view component removed - focusing on Admin functionality only
// If ship functionality is needed later, it should use direct API calls instead of LiveStore

export const ShipView: React.FC = () => {
	return (
		<Alert variant="info">
			<h6>Ship View Unavailable</h6>
			<p>Ship view functionality has been removed to focus on Admin components.</p>
		</Alert>
	);
};
