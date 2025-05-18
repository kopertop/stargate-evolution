import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from './player-store';
import { useGameStore } from '../game'; // Import game store

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
	// Distance to trigger travel - match interaction-system.tsx
	const TRAVEL_TRIGGER_DISTANCE = 3;

	// Get player state and actions
	const { setIsInWormhole: setPlayerIsInWormhole, travel } = usePlayerStore();
	// Get game store actions
	const { setIsInWormhole: setGameIsInWormhole } = useGameStore();

	// Track if we've initiated travel
	const isTravelingRef = useRef(false);
	const travelStartTimeRef = useRef<number | null>(null);
	const TRAVEL_DURATION = 3; // in seconds

	// Check character proximity to stargate
	useFrame(({ clock }) => {
		// Only check if stargate is active and fully activated (stage 9)
		if (!stargateActive || activationStage < 9 || isTravelingRef.current) {
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
			// Start travel sequence automatically when close enough
			console.log('TRAVEL TRIGGERED: Starting travel sequence to', targetPlanet, targetLocation);
			isTravelingRef.current = true;
			travelStartTimeRef.current = clock.getElapsedTime();

			// Set wormhole state in BOTH stores
			console.log('TRAVEL TRIGGERED: Setting isInWormhole=true in Player and Game stores');
			setPlayerIsInWormhole(true);
			setGameIsInWormhole(true);

			// Play travel sound
			const travelSound = new Audio('/sounds/stargate-travel.mp3');
			travelSound.volume = 0.6;
			travelSound.play().catch(err => console.error('Failed to play travel sound:', err));

			// IMPORTANT: Travel completion logic is now handled in App.tsx because this component unmounts
		}

		// --- Travel completion logic removed from here as component unmounts ---
		/*
		if (isTravelingRef.current && travelStartTimeRef.current !== null) {
			const travelTime = clock.getElapsedTime() - travelStartTimeRef.current;
			if (travelTime >= TRAVEL_DURATION) {
				// ... completion logic was here ...
			}
		}
		*/
	});

	// Reset if stargate deactivates - also needs to reset both stores
	useEffect(() => {
		if (!stargateActive && isTravelingRef.current) {
			console.log('Stargate deactivated during travel trigger phase, canceling');
			isTravelingRef.current = false;
			travelStartTimeRef.current = null;
			// Reset both stores if cancelled before travel fully starts
			setPlayerIsInWormhole(false);
			setGameIsInWormhole(false);
		}
	}, [stargateActive, setPlayerIsInWormhole, setGameIsInWormhole]);

	// Visual component - this is purely logic
	return null;
};
