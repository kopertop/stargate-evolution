import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from '../app';
import { DHD, Stargate, Room } from './assets';
import CharacterController from './character-controller';
import * as THREE from 'three';

const StargateRoom: React.FC = () => {
	const { updateLocation } = useLocation();
	const [stargateActive, setStargateActive] = useState(false);
	const characterRef = useRef<THREE.Mesh>(null);
	const [interactionHint, setInteractionHint] = useState('');

	// Add interaction hint to DOM
	useEffect(() => {
		const hintElement = document.getElementById('interaction-hint');

		if (interactionHint && hintElement) {
			hintElement.textContent = interactionHint;
			hintElement.style.display = 'block';
		} else if (hintElement) {
			hintElement.style.display = 'none';
		} else {
			// Create interaction hint element if it doesn't exist
			const newHintElement = document.createElement('div');
			newHintElement.id = 'interaction-hint';
			newHintElement.className = 'interaction-hint';
			document.body.appendChild(newHintElement);
		}

		return () => {
			// Clean up hint element on component unmount
			const el = document.getElementById('interaction-hint');
			if (el) el.style.display = 'none';
		};
	}, [interactionHint]);

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

	// Handle interactions from character controller
	const handleInteraction = (target: THREE.Object3D | null) => {
		if (!target) {
			setInteractionHint('');
			return;
		}

		// Find the parent object with a name
		let current = target;
		while (current && !current.name && current.parent) {
			current = current.parent;
		}

		if (current.name === 'dhd') {
			setInteractionHint('Press Space to activate DHD');
			simulateTravel(); // Activate the DHD directly
		} else if (current.name === 'stargate') {
			setInteractionHint('Press Space to enter Stargate');
			simulateTravel(); // Activate the stargate directly
		} else {
			setInteractionHint('');
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

			{/* Character controller */}
			<CharacterController ref={characterRef} onInteract={handleInteraction} />

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
