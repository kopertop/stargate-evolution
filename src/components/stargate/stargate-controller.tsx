import React, { useEffect, useState, useRef, useCallback, forwardRef } from 'react';
import * as THREE from 'three';
import Stargate from '../assets/stargate';
import { useStargateStore } from './stargate-store';

interface StargateControllerProps {
	position: [number, number, number];
	destination: string;
	isActive: boolean;
	onDeactivate: () => void;
	onStageChange: (stage: number) => void;
	onTravel: () => void;
	isTraveling: boolean;
	setIsInWormhole: (isInWormhole: boolean) => void;
}

export const StargateController = forwardRef<THREE.Group, StargateControllerProps>(({
	position,
	destination,
	isActive,
	onDeactivate,
	onStageChange,
	onTravel,
	isTraveling,
	setIsInWormhole
}, ref) => {
	const [activationStage, setActivationStage] = useState(0);
	const [isShuttingDown, setIsShuttingDown] = useState(false);
	const activationTimerRef = useRef<NodeJS.Timeout | null>(null);
	const stargateRef = useRef<THREE.Group>(null);
	const activationInProgressRef = useRef(false);

	// Timing constants for the activation sequence
	const CHEVRON_DELAY = 1000; // 1 second between chevrons
	const FINAL_CHEVRON_DELAY = 1500; // 1.5 seconds for the final chevron

	// Get store values
	const { setCurrentDestination } = useStargateStore();

	// Forward the ref to the parent
	useEffect(() => {
		if (ref && 'current' in ref) {
			ref.current = stargateRef.current;
		}
	}, [ref]);

	// Function to advance the activation stage
	const advanceStage = useCallback(() => {
		setActivationStage(prevStage => {
			const nextStage = prevStage + 1;
			onStageChange(nextStage);
			return nextStage;
		});
	}, [onStageChange]);

	// Start the activation sequence with proper timing
	const startActivationSequence = useCallback(() => {
		// Don't start if already in progress
		if (activationInProgressRef.current) return;

		activationInProgressRef.current = true;
		console.log('Starting stargate activation sequence');

		// Start with first chevron
		advanceStage();

		// Schedule all remaining chevrons with sequential timeouts
		const scheduleChevron = (chevronNumber: number, delay: number) => {
			setTimeout(() => {
				if (isActive) {
					console.log(`Scheduling chevron ${chevronNumber}`);

					// Play chevron locking sound
					new Audio('/sounds/chevron-lock.mp3').play().catch((err) => {
						console.error('Failed to play chevron sound:', err);
					});

					// Advance to next stage
					advanceStage();

					// If this was the 7th chevron, schedule the kawoosh
					if (chevronNumber === 7) {
						setTimeout(() => {
							if (isActive) {
								console.log('Playing kawoosh sound');
								new Audio('/sounds/stargate-kawoosh.mp3').play().catch((err) => {
									console.error('Failed to play kawoosh sound:', err);
								});

								// Final stage (event horizon forms)
								advanceStage();
							}
						}, FINAL_CHEVRON_DELAY);
					}
				}
			}, delay);
		};

		// Schedule chevrons 2-7 with increasing delays
		for (let i = 2; i <= 7; i++) {
			scheduleChevron(i, (i-1) * CHEVRON_DELAY);
		}
	}, [isActive, advanceStage]);

	// Update store with current destination
	useEffect(() => {
		setCurrentDestination(destination);
	}, [destination, setCurrentDestination]);

	// Handle activation state changes
	useEffect(() => {
		// When activation starts
		if (isActive && activationStage === 0 && !activationInProgressRef.current) {
			// Start the activation sequence
			startActivationSequence();
		}
		// When deactivation starts
		else if (!isActive && activationStage > 0) {
			// Reset activation in progress flag
			activationInProgressRef.current = false;

			// Handle deactivation
			console.log('Shutting down stargate');
			setIsShuttingDown(true);
			new Audio('/sounds/stargate-shutdown.mp3').play().catch(err =>
				console.error('Failed to play shutdown sound:', err)
			);

			// Reset after a delay
			const timer = setTimeout(() => {
				setActivationStage(0);
				onStageChange(0);
				onDeactivate();
				setIsShuttingDown(false);
			}, 2000);

			return () => clearTimeout(timer);
		}
	}, [isActive, activationStage, startActivationSequence, onStageChange, onDeactivate]);

	// Handle travel
	useEffect(() => {
		if (!isTraveling) return;

		// Initiate wormhole travel
		setIsInWormhole(true);

		// Reset after travel completes
		activationTimerRef.current = setTimeout(() => {
			setActivationStage(0);
			onStageChange(0);
			onDeactivate();
			setIsInWormhole(false);
			activationInProgressRef.current = false;
		}, 3000);

		// Clean up timer on unmount
		return () => {
			if (activationTimerRef.current) {
				clearTimeout(activationTimerRef.current);
			}
		};
	}, [
		isTraveling,
		onDeactivate,
		onStageChange,
		setIsInWormhole
	]);

	// Handle activation stage changes from the Stargate component
	const handleActivationStageChange = (stage: number) => {
		if (stage !== activationStage) {
			setActivationStage(stage);
			onStageChange(stage);
		}
	};

	return (
		<group ref={stargateRef} position={position} name="stargate-controller">
			<Stargate
				position={[0, 0, 0]}
				isActive={isActive}
				activationStage={activationStage}
				isShuttingDown={isShuttingDown}
				onActivationStageChange={handleActivationStageChange}
			/>
		</group>
	);
});
