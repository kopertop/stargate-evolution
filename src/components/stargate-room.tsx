import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from '../app';
import { DHD, Stargate, Room } from './assets';
import CharacterController from './character-controller';
import * as THREE from 'three';

// Define themes for different planets
const PLANET_THEMES = {
	Earth: {
		wallColor: '#555555',
		floorColor: '#444444',
		ambientLight: '#ffffff',
		pointLightColor: '#66ccff'
	},
	Abydos: {
		wallColor: '#AA8855', // Sandy/desert color
		floorColor: '#8A6642', // Darker sand color
		ambientLight: '#ffebcd', // Desert light color
		pointLightColor: '#ffdab9' // Peach/sand color for lights
	},
	// Add more planets as needed
};

const StargateRoom: React.FC = () => {
	const { planet, location, updateLocation, startTravel } = useLocation();
	const [dhdActive, setDhdActive] = useState(false);
	const [stargateActive, setStargateActive] = useState(false);
	const characterRef = useRef<THREE.Group>(null);
	const [interactionHint, setInteractionHint] = useState('');
	const [interactableObject, setInteractableObject] = useState<string | null>(null);
	const stargatePositionRef = useRef(new THREE.Vector3(0, 2.5, -9));
	const lastCheckedPositionRef = useRef(new THREE.Vector3());
	const hasEnteredGateRef = useRef(false);

	// Get current planet theme
	const theme = PLANET_THEMES[planet as keyof typeof PLANET_THEMES] || PLANET_THEMES.Earth;

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

	// Listen for spacebar press to trigger interaction with DHD only
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space' && interactableObject === 'dhd') {
				activateDHD();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [interactableObject]);

	// Continuously check if character is near the stargate for hints and travel
	useEffect(() => {
		const checkStargateProximity = () => {
			if (!characterRef.current) return;

			const characterPosition = characterRef.current.position.clone();
			const stargatePosition = stargatePositionRef.current;

			// Calculate distance to stargate
			const horizontalDistance = Math.sqrt(
				Math.pow(characterPosition.x - stargatePosition.x, 2) +
				Math.pow(characterPosition.y - stargatePosition.y, 2)
			);

			// Distance in front/behind the gate
			const distanceInFrontOfGate = characterPosition.z - stargatePosition.z;

			// Update last checked position
			lastCheckedPositionRef.current.copy(characterPosition);

			// Check if stargate is active and character is approaching it from the front
			if (stargateActive && horizontalDistance < 5 && distanceInFrontOfGate > 0 && distanceInFrontOfGate < 5) {
				// Only show the hint if we're not already showing it and not showing DHD hint
				if (interactionHint !== 'Walk through the event horizon to travel' &&
					interactableObject !== 'dhd') {
					setInteractionHint('Walk through the event horizon to travel');
				}
			} else if (interactionHint === 'Walk through the event horizon to travel' &&
				(horizontalDistance >= 5 || distanceInFrontOfGate <= 0 || distanceInFrontOfGate >= 5)) {
				// Clear the walk-through hint when moving away
				if (interactableObject !== 'dhd') {
					setInteractionHint('');
				}
			}

			// IMPROVED: More forgiving travel detection
			// Check for proximity to the gate rather than requiring to cross through it
			const isNearGatePlane = Math.abs(characterPosition.z - stargatePosition.z) < 1.5; // Wider detection zone
			const isWithinRadius = horizontalDistance < 3.0; // Larger radius for detection
			const isApproachingGate = characterPosition.z > stargatePosition.z &&
			                          Math.abs(characterPosition.z - stargatePosition.z) < 2.5; // Check if approaching from front

			// If close enough to the active stargate from the front side
			if (stargateActive && isNearGatePlane && isWithinRadius &&
				isApproachingGate && !hasEnteredGateRef.current) {
				hasEnteredGateRef.current = true;
				travel();
			} else if ((!isNearGatePlane || !isWithinRadius) &&
			           characterPosition.distanceTo(stargatePosition) > 4.0) {
				// Reset flag when away from gate - using a larger reset distance
				hasEnteredGateRef.current = false;
			}
		};

		const interval = setInterval(checkStargateProximity, 100);
		return () => clearInterval(interval);
	}, [stargateActive, interactionHint, interactableObject]);

	// Ensure stargate is deactivated when DHD becomes inactive
	useEffect(() => {
		if (!dhdActive && stargateActive) {
			// When DHD becomes inactive, also deactivate the stargate
			setStargateActive(false);
		}
	}, [dhdActive, stargateActive]);

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

			// Update the message for a moment to show "Traveling..."
			setInteractionHint('Entering wormhole...');

			// Start the travel effect
			setTimeout(() => {
				startTravel(); // This triggers the wormhole effect

				// Update location after a brief delay
				setTimeout(() => {
					// Switch destination based on current location
					if (planet === 'Earth') {
						updateLocation('Abydos', 'Temple of Ra');
					} else {
						updateLocation('Earth', 'Stargate Command');
					}

					// The gate will be deactivated automatically when we return
					// from the wormhole effect sequence
					deactivateGate();
					setInteractionHint('');
				}, 1000);
			}, 500);
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
			// Only clear hints if they were set by this function
			// Don't clear if they were set by our proximity checker
			if (interactableObject === 'dhd') {
				setInteractionHint('');
				setInteractableObject(null);
			}
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
		} else {
			// For other objects, only clear the hint if it's not showing the stargate hint
			// and we're not currently in DHD interaction
			if (interactionHint !== 'Walk through the event horizon to travel' && interactableObject !== 'dhd') {
				setInteractionHint('');
				setInteractableObject(null);
			}
		}
	};

	return (
		<group>
			{/* Basic room structure with planet-specific colors */}
			<Room
				size={[20, 20]}
				wallHeight={5}
				wallColor={theme.wallColor}
				floorColor={theme.floorColor}
			/>

			{/* Stargate - Set noCollide to true to allow walking through */}
			<Stargate
				position={[0, 2.5, -9]}
				isActive={stargateActive}
				noCollide={true}
				onActivate={() => {}}
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
				interactionRadius={4.5}
				interactionAngle={75}
				// Ensure the stargate doesn't block movement
				ignoreObjects={['stargate']}
			/>

			{/* Room lighting colored based on planet */}
			<ambientLight intensity={0.3} color={theme.ambientLight} />
			<pointLight position={[0, 4, 0]} intensity={0.5} color={theme.pointLightColor} />
			<pointLight position={[0, 4, -5]} intensity={0.3} color={theme.pointLightColor} />
			<pointLight
				position={[0, 4, -9]}
				intensity={stargateActive ? 0.8 : 0.3}
				color={stargateActive ? "#66eeff" : theme.pointLightColor}
			/>
		</group>
	);
};

export default StargateRoom;
