import React, { useState } from 'react';
import { useLocation } from '../app';
import { DHD, Stargate, Room } from './assets';

const StargateRoom: React.FC = () => {
	const { updateLocation } = useLocation();
	const [stargateActive, setStargateActive] = useState(false);

	// Function to simulate traveling to a new planet
	const simulateTravel = () => {
		if (!stargateActive) {
			// Activate the stargate
			setStargateActive(true);

			// After 3 seconds, "travel" to Abydos
			setTimeout(() => {
				updateLocation('Abydos', 'Temple of Ra');

				// After another 2 seconds, deactivate the stargate
				setTimeout(() => {
					setStargateActive(false);
				}, 2000);
			}, 3000);
		}
	};

	return (
		<group>
			{/* Basic room structure */}
			<Room size={[20, 20]} wallHeight={5} />

			{/* Stargate */}
			<Stargate
				position={[0, 2.5, -9]}
				isActive={stargateActive}
				onActivate={simulateTravel}
			/>

			{/* DHD (Dial Home Device) */}
			<DHD
				position={[8, 0.5, 0]}
				isActive={stargateActive}
				onActivate={simulateTravel}
			/>

			{/* Room lighting */}
			<pointLight position={[0, 4, 0]} intensity={0.5} />
			<pointLight position={[0, 4, -5]} intensity={0.3} />
			<pointLight
				position={[0, 4, -9]}
				intensity={stargateActive ? 0.8 : 0.3}
				color={stargateActive ? "#66eeff" : "#66ccff"}
			/>
		</group>
	);
};

export default StargateRoom;
