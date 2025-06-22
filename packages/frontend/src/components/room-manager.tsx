import React from 'react';
import { Alert } from 'react-bootstrap';

/**
 * RoomManager component placeholder
 * The original room manager is deprecated in favor of the Admin panel
 */
export const RoomManager: React.FC = () => {
	return (
		<Alert variant="info" className="m-3">
			<h5>Room Manager</h5>
			<p>This component is part of the deprecated game interface. Please use the Admin panel&apos;s Room Builder for room management.</p>
		</Alert>
	);
};
