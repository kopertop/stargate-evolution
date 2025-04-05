import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from '../app';
import { DHD, Stargate, Room } from './assets';
import CharacterController from './character-controller';
import * as THREE from 'three';

const StargateRoom: React.FC = () => {
	const { updateLocation } = useLocation();
	const [dhdActive, setDhdActive] = useState(false);
	const [stargateActive, setStargateActive] = useState(false);
	const characterRef = useRef<THREE.Mesh>(null);
	const [interactionHint, setInteractionHint] = useState('');
	const [interactableObject, setInteractableObject] = useState<string | null>(null);

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

	// Listen for spacebar press to trigger interaction
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space' && interactableObject) {
				if (interactableObject === 'dhd') {
					activateDHD();
				} else if (interactableObject === 'stargate' && stargateActive) {
					// Only allow travel through an already active stargate
					travel();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [interactableObject, stargateActive]);

	// Function to activate the DHD, which then activates the Stargate
	const activateDHD = () => {
		if (!dhdActive && !stargateActive) {
			// Activate the DHD first
			setDhdActive(true);

			// After a short delay, activate the stargate
			setTimeout(() => {
				setStargateActive(true);

				// Set a timer to auto-deactivate if no travel happens
				const deactivationTimer = setTimeout(() => {
					deactivateGate();
				}, 20000); // Auto-deactivate after 20 seconds if not used

				// Store the timer ID to clear it if travel happens
				(window as any).deactivationTimer = deactivationTimer;
			}, 2500); // Delay before stargate activates after DHD
		}
	};

	// Function to travel through the stargate
	const travel = () => {
		if (stargateActive) {
			// Clear any pending deactivation timer
			if ((window as any).deactivationTimer) {
				clearTimeout((window as any).deactivationTimer);
				(window as any).deactivationTimer = null;
			}

			// After a short delay (to show the person entering the event horizon), change location
			setTimeout(() => {
				updateLocation('Abydos', 'Temple of Ra');

				// After a delay, deactivate the gate on the other side
				setTimeout(() => {
					deactivateGate();
				}, 2000);
			}, 1000);
		}
	};

	// Function to deactivate both the stargate and DHD
	const deactivateGate = () => {
		setStargateActive(false);
		setDhdActive(false);
	};

	// Handle interactions from character controller
	const handleInteraction = (target: THREE.Object3D | null) => {
		if (!target) {
			setInteractionHint('');
			setInteractableObject(null);
			return;
		}

		// Find the parent object with a name
		let current = target;
		while (current && !current.name && current.parent) {
			current = current.parent;
		}

		if (current.name === 'dhd' && !stargateActive) {
			setInteractionHint('Press Space to activate DHD');
			setInteractableObject('dhd');
		} else if (current.name === 'stargate' && stargateActive) {
			setInteractionHint('Press Space to enter Stargate');
			setInteractableObject('stargate');
		} else {
			setInteractionHint('');
			setInteractableObject(null);
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
				onActivate={() => {
					if (stargateActive) {
						travel();
					}
				}}
			/>

			{/* DHD (Dial Home Device) */}
			<DHD
				position={[8, 0.5, 0]}
				isActive={dhdActive}
				onActivate={activateDHD}
			/>

			{/* Character controller with configurable interaction parameters */}
			<CharacterController
				ref={characterRef}
				onInteract={handleInteraction}
				interactionRadius={4.5}   // Adjust this to make it easier/harder to interact
				interactionAngle={75}     // Adjust this to widen/narrow the interaction field of view
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
