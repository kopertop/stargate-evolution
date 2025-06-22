import React from 'react';

// Ship door component removed - focusing on Admin functionality only
// If ship door functionality is needed later, it should use direct API calls instead of LiveStore

export const ShipDoor: React.FC = () => {
	return (
		<g>
			<text x="10" y="10" fill="white" fontSize="8" textAnchor="middle">
				Door Unavailable
			</text>
		</g>
	);
};
