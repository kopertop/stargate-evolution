import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from './player-store';

interface TravelControllerProps {
	characterRef: React.RefObject<THREE.Group | null>;
	stargateRef: React.RefObject<THREE.Group | null>;
	stargateActive: boolean;
	activationStage: number;
	targetPlanet: string;
	targetLocation: string;
	onTravelComplete: () => void;
}

export const TravelController: React.FC<TravelControllerProps> = ({
	characterRef,
	stargateRef,
	stargateActive,
	activationStage,
	targetPlanet,
	targetLocation,
	onTravelComplete,
}) => {
	// Distance to trigger travel
	const TRAVEL_TRIGGER_DISTANCE = 1.5;

	// Get player state and actions
	const { isInWormhole, setIsInWormhole, travel } = usePlayerStore();

	// Track if we've initiated travel
	const isTravelingRef = useRef(false);
	const travelStartTimeRef = useRef<number | null>(null);
	const TRAVEL_DURATION = 3; // in seconds

	// Check character proximity to stargate
	useFrame(({ clock }) => {
		// Only check if stargate is active and fully activated
		if (!stargateActive || activationStage < 7 || isTravelingRef.current) {
			return;
		}

		// Ensure both refs exist
		if (!characterRef.current || !stargateRef.current) {
			return;
		}

		// Calculate distance between character and stargate
		const characterPosition = characterRef.current.position;
		const stargatePosition = stargateRef.current.position;

		const distance = characterPosition.distanceTo(
			new THREE.Vector3(stargatePosition.x, characterPosition.y, stargatePosition.z)
		);

		// Check if character is close enough to the stargate
		if (distance <= TRAVEL_TRIGGER_DISTANCE) {
			// Start travel sequence
			console.log('Starting travel sequence to', targetPlanet, targetLocation);
			isTravelingRef.current = true;
			travelStartTimeRef.current = clock.getElapsedTime();
			setIsInWormhole(true);

			// Play travel sound
			const travelSound = new Audio('/sounds/stargate-travel.mp3');
			travelSound.volume = 0.6;
			travelSound.play().catch(err => console.error('Failed to play travel sound:', err));
		}

		// If traveling, check if travel duration has elapsed
		if (isTravelingRef.current && travelStartTimeRef.current !== null) {
			const travelTime = clock.getElapsedTime() - travelStartTimeRef.current;

			if (travelTime >= TRAVEL_DURATION) {
				// Complete travel
				console.log('Travel complete to', targetPlanet, targetLocation);
				travel(targetPlanet as any, targetLocation);
				isTravelingRef.current = false;
				travelStartTimeRef.current = null;
				onTravelComplete();
			}
		}
	});

	// Handle space key press to initiate travel
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only trigger if near stargate, it's active, and fully activated
			if (e.code === 'Space' && stargateActive && activationStage >= 7 &&
				characterRef.current && stargateRef.current) {

				const characterPosition = characterRef.current.position;
				const stargatePosition = stargateRef.current.position;

				const distance = characterPosition.distanceTo(
					new THREE.Vector3(stargatePosition.x, characterPosition.y, stargatePosition.z)
				);

				if (distance <= TRAVEL_TRIGGER_DISTANCE) {
					// Start travel sequence
					console.log('Starting travel sequence from key press');
					isTravelingRef.current = true;
					travelStartTimeRef.current = performance.now() / 1000;
					setIsInWormhole(true);

					// Play travel sound
					const travelSound = new Audio('/sounds/stargate-travel.mp3');
					travelSound.volume = 0.6;
					travelSound.play().catch(err => console.error('Failed to play travel sound:', err));
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [stargateActive, activationStage, characterRef, stargateRef, setIsInWormhole]);

	// Reset if stargate deactivates
	useEffect(() => {
		if (!stargateActive && isTravelingRef.current) {
			console.log('Stargate deactivated during travel, canceling');
			isTravelingRef.current = false;
			travelStartTimeRef.current = null;
			setIsInWormhole(false);
		}
	}, [stargateActive, setIsInWormhole]);

	// Visual component - this is purely logic
	return null;
};
