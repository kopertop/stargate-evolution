import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { checkStargateProximity } from './travel-utils';

export interface InteractionSystemProps {
	characterRef: React.RefObject<THREE.Group>;
	stargatePositionRef: React.RefObject<THREE.Vector3>;
	dhdPositionRef: React.RefObject<THREE.Vector3>;
	stargateActive: boolean;
	activationStage: number;
	interactionHint: string;
	interactableObject: string | null;
	setInteractionHint: (hint: string) => void;
	setInteractableObject: (object: string | null) => void;
	onDHDInteract: () => void;
	onStartTravel: () => void;
}

export const InteractionSystem: React.FC<InteractionSystemProps> = ({
	characterRef,
	stargatePositionRef,
	dhdPositionRef,
	stargateActive,
	activationStage,
	interactionHint,
	interactableObject,
	setInteractionHint,
	setInteractableObject,
	onDHDInteract,
	onStartTravel
}) => {
	const interactionCheckInterval = useRef<NodeJS.Timeout | null>(null);
	const [canTravel, setCanTravel] = useState(false);

	// Setup the interaction system
	useEffect(() => {
		// Clean up the previous interval if it exists
		if (interactionCheckInterval.current) {
			clearInterval(interactionCheckInterval.current);
		}

		// Set up a new interval to check for interactions
		interactionCheckInterval.current = setInterval(() => {
			updateInteractionHints();
		}, 200);

		return () => {
			if (interactionCheckInterval.current) {
				clearInterval(interactionCheckInterval.current);
			}
		};
	}, []);

	// Update interaction hints based on proximity to objects and their states
	const updateInteractionHints = () => {
		if (!characterRef.current || !stargatePositionRef.current || !dhdPositionRef.current) {
			// Skip updating if references are not available
			return;
		}

		const characterPosition = characterRef.current.position.clone();
		const stargatePosition = stargatePositionRef.current.clone();
		const dhdPosition = dhdPositionRef.current.clone();

		// Check for stargate travel possibility
		if (stargateActive && activationStage >= 4) {
			// Calculate distance to stargate
			const distanceToStargate = Math.sqrt(
				Math.pow(characterPosition.x - stargatePosition.x, 2) +
				Math.pow(characterPosition.z - stargatePosition.z, 2)
			);

			// Check if close enough to travel
			if (distanceToStargate < 2.0) {
				setCanTravel(true);
				// Don't override hint if it's already set
				if (interactionHint !== 'Press SPACE to travel through the Stargate') {
					setInteractionHint('Press SPACE to travel through the Stargate');
					setInteractableObject('stargate');
				}
				return;
			} else {
				setCanTravel(false);
			}
		}

		// Calculate distance to DHD
		const distanceToDHD = Math.sqrt(
			Math.pow(characterPosition.x - dhdPosition.x, 2) +
			Math.pow(characterPosition.z - dhdPosition.z, 2)
		);

		// Interaction with DHD
		if (distanceToDHD < 2.5) {
			if (!stargateActive) {
				setInteractionHint('Press SPACE to dial the Stargate');
				setInteractableObject('dhd');
			} else {
				setInteractionHint('Press SPACE to deactivate the Stargate');
				setInteractableObject('dhd');
			}
		}
		// Near the stargate but need more context
		else if (stargateActive) {
			const distanceToStargate = Math.sqrt(
				Math.pow(characterPosition.x - stargatePosition.x, 2) +
				Math.pow(characterPosition.z - stargatePosition.z, 2)
			);

			if (distanceToStargate < 5) {
				if (activationStage < 4) {
					setInteractionHint('Stargate is activating... wait for connection');
					setInteractableObject(null);
				} else {
					setInteractionHint('Get closer to the Stargate to travel');
					setInteractableObject(null);
				}
			} else {
				// Clear hints when no interaction is available
				if (interactableObject === 'stargate' || interactableObject === 'dhd') {
					setInteractionHint('');
					setInteractableObject(null);
				}
			}
		}
		// No interaction available
		else if (interactableObject !== null) {
			setInteractionHint('');
			setInteractableObject(null);
		}
	};

	// Handle keyboard interaction (Space key)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space' && interactionHint && interactableObject) {
				console.log('Interaction triggered with:', interactableObject);

				if (interactableObject === 'stargate' && canTravel) {
					console.log('Starting travel...');
					onStartTravel();
				} else if (interactableObject === 'dhd') {
					console.log('Interacting with DHD...');
					onDHDInteract();
				}

				// Prevent default space behavior (scrolling)
				e.preventDefault();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [interactionHint, interactableObject, canTravel, onDHDInteract, onStartTravel]);

	// Only render if there's an interaction hint and character exists
	if (!interactionHint || !characterRef.current) return null;

	// Render the hint using Html from drei
	return (
		<Html
			position={[
				characterRef.current.position.x,
				characterRef.current.position.y + 2.5, // Position above character
				characterRef.current.position.z
			]}
			center
			distanceFactor={10}
		>
			<div
				style={{
					background: 'rgba(0, 0, 0, 0.7)',
					color: '#00ffff',
					padding: '8px 12px',
					borderRadius: '4px',
					fontFamily: 'monospace',
					fontSize: '16px',
					userSelect: 'none',
					pointerEvents: 'none',
					whiteSpace: 'nowrap'
				}}
			>
				{interactionHint}
			</div>
		</Html>
	);
};
