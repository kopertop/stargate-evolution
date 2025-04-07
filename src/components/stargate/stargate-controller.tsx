import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Stargate } from '../assets';
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

export const StargateController: React.FC<StargateControllerProps> = ({
	position,
	destination,
	isActive,
	onDeactivate,
	onStageChange,
	onTravel,
	isTraveling,
	setIsInWormhole
}) => {
	const [activationStage, setActivationStage] = useState(0);
	const [isShuttingDown, setIsShuttingDown] = useState(false);
	const activationTimerRef = useRef<NodeJS.Timeout | null>(null);
	const { setCurrentDestination, activationSound } = useStargateStore();

	// Update store with current destination
	useEffect(() => {
		setCurrentDestination(destination);
	}, [destination, setCurrentDestination]);

	// Handle activation sequence
	useEffect(() => {
		// Clear any existing timers
		if (activationTimerRef.current) {
			clearTimeout(activationTimerRef.current);
			activationTimerRef.current = null;
		}

		// Start activation sequence if stargate is active
		if (isActive && !isTraveling && !isShuttingDown) {
			setIsShuttingDown(false);

			// Start with stage 0
			if (activationStage === 0) {
				// Play activation sound
				if (activationSound) {
					activationSound.currentTime = 0;
					activationSound.play().catch(e => console.error('Error playing sound:', e));
				}

				// Start the activation sequence
				let currentStage = 0;

				const advanceStage = () => {
					currentStage += 1;
					setActivationStage(currentStage);
					onStageChange(currentStage);

					// Continue until fully activated (stage 4)
					if (currentStage < 4) {
						activationTimerRef.current = setTimeout(advanceStage, 1000);
					}
				};

				// Start the sequence after a short delay
				activationTimerRef.current = setTimeout(advanceStage, 500);
			}
		}

		// Handle deactivation
		else if (!isActive && activationStage > 0 && !isTraveling) {
			setIsShuttingDown(true);

			// Play shutdown sound (reverse of activation)
			if (activationSound) {
				activationSound.currentTime = 0;
				activationSound.play().catch(e => console.error('Error playing sound:', e));
			}

			// Gradually step down the activation stages
			const shutdownSequence = () => {
				setActivationStage(prev => {
					const newStage = prev - 1;
					onStageChange(newStage);

					if (newStage > 0) {
						activationTimerRef.current = setTimeout(shutdownSequence, 500);
					} else {
						setIsShuttingDown(false);
					}

					return newStage;
				});
			};

			activationTimerRef.current = setTimeout(shutdownSequence, 500);
		}

		// Handle travel
		else if (isTraveling && activationStage >= 4) {
			// Initiate wormhole travel
			setIsInWormhole(true);

			// Reset after travel completes
			activationTimerRef.current = setTimeout(() => {
				setActivationStage(0);
				onStageChange(0);
				onDeactivate();
				setIsInWormhole(false);
			}, 3000);
		}

		// Clean up timer on unmount
		return () => {
			if (activationTimerRef.current) {
				clearTimeout(activationTimerRef.current);
			}
		};
	}, [
		isActive,
		activationStage,
		onStageChange,
		isTraveling,
		onDeactivate,
		setIsInWormhole,
		isShuttingDown,
		activationSound
	]);

	return (
		<Stargate
			position={position}
			isActive={isActive || isShuttingDown}
			onActivationStageChange={(stage) => onStageChange(stage)}
		/>
	);
};
