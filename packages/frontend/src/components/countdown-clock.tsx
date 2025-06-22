import React from 'react';
import { Alert } from 'react-bootstrap';

/**
 * CountdownClock component placeholder
 * The original countdown clock is deprecated in favor of the Admin panel
 */
export const CountdownClock: React.FC = () => {
	return (
		<Alert variant="info" className="m-3">
			<h5>Countdown Clock</h5>
			<p>This component is part of the deprecated game interface. Please use the Admin panel for ship management.</p>
		</Alert>
	);
};
