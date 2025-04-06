import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { TravelSystemState, checkStargateProximity } from './travel-system';

interface InteractionSystemProps {
	characterRef: React.RefObject<THREE.Group | null>;
	stargatePosition: THREE.Vector3;
	dhdPosition: THREE.Vector3;
	stargateActive: boolean;
	stargateActivationStage: number;
	currentPlanet: string;
	onInteraction: (target: string) => void;
}

export const InteractionSystem: React.FC<InteractionSystemProps> = ({
	characterRef,
	stargatePosition,
	dhdPosition,
	stargateActive,
	stargateActivationStage,
	currentPlanet,
	onInteraction
}) => {
	const [interactionHint, setInteractionHint] = useState<string | null>(null);
	const [canTravelThroughStargate, setCanTravelThroughStargate] = useState(false);
	const interactionCheckInterval = useRef<NodeJS.Timeout | null>(null);

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
	}, [characterRef, stargatePosition, dhdPosition, stargateActive, stargateActivationStage]);

	// Update interaction hints based on proximity to objects and their states
	const updateInteractionHints = () => {
		if (!characterRef.current) {
			// Skip updating if character ref is not available
			return;
		}

		const characterPosition = characterRef.current.position.clone();

		// Create state for travel system check
		const travelState: TravelSystemState = {
			characterPosition,
			stargatePosition,
			activePlanet: currentPlanet as any, // TypeScript conversion
			stargateActive: stargateActive || false, // Ensure boolean
			stargateActivationStage: stargateActivationStage || 0 // Ensure number
		};

		// Check for stargate proximity first
		const canTravelNow = checkStargateProximity(travelState);
		setCanTravelThroughStargate(canTravelNow);

		if (canTravelNow) {
			setInteractionHint(`Press SPACE to walk through the Stargate to ${currentPlanet === 'Earth' ? 'Abydos' : 'Earth'}`);
			return;
		}

		// Calculate distances
		const distanceToDHD = Math.sqrt(
			Math.pow(characterPosition.x - dhdPosition.x, 2) +
			Math.pow(characterPosition.z - dhdPosition.z, 2)
		);

		const distanceToStargate = Math.sqrt(
			Math.pow(characterPosition.x - stargatePosition.x, 2) +
			Math.pow(characterPosition.z - stargatePosition.z, 2)
		);

		// Interaction with DHD
		if (distanceToDHD < 3) {
			if (!stargateActive) {
				setInteractionHint('Press SPACE to dial the Stargate');
			} else {
				setInteractionHint('Press SPACE to deactivate the Stargate');
			}
		}
		// Near the stargate but need more context
		else if (distanceToStargate < 5) {
			if (stargateActive) {
				if (stargateActivationStage < 4) {
					setInteractionHint('Stargate is activating... wait for connection');
				} else {
					setInteractionHint('Get closer to the Stargate to travel');
				}
			} else {
				setInteractionHint('Use the DHD to dial the Stargate');
			}
		}
		// No interaction available
		else {
			setInteractionHint(null);
		}
	};

	// Handle keyboard interaction (Space key)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space' && interactionHint) {
				console.log('Interaction triggered:', interactionHint);

				if (canTravelThroughStargate) {
					onInteraction('stargate');
				} else if (interactionHint.includes('dial the Stargate')) {
					onInteraction('dhd');
				} else if (interactionHint.includes('deactivate')) {
					onInteraction('dhd');
				}

				// Prevent default space behavior (scrolling)
				e.preventDefault();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [interactionHint, canTravelThroughStargate, onInteraction]);

	// Only render if there's an interaction hint and character exists
	if (!interactionHint || !characterRef.current) return null;

	// Render the hint using Html from drei
	return (
		<group position={[0, 0, 0]}>
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
						pointerEvents: 'none'
					}}
				>
					{interactionHint}
				</div>
			</Html>
		</group>
	);
};
