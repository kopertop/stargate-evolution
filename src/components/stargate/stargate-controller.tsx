import React, { useEffect, useState, useRef, useCallback } from 'react';
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
	const [hasPlayedKawoosh, setHasPlayedKawoosh] = useState(false);
	const [isShuttingDown, setIsShuttingDown] = useState(false);
	const activationTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Get store values
	const { setCurrentDestination } = useStargateStore();

	// Function to advance the activation stage
	const advanceStage = useCallback(() => {
		setActivationStage(prevStage => {
			const nextStage = prevStage + 1;
			onStageChange(nextStage);
			return nextStage;
		});
	}, [onStageChange]);

	// Update store with current destination
	useEffect(() => {
		setCurrentDestination(destination);
	}, [destination, setCurrentDestination]);

	// Handle activation sequence
	useEffect(() => {
		let timer: NodeJS.Timeout | null = null;

		// Handle activation state changes
		if (isActive) {
			if (activationStage === 0) {
				// Start activation sequence
				console.log('Starting stargate activation sequence');
				advanceStage();
			} else if (activationStage === 8 && !hasPlayedKawoosh) {
				setHasPlayedKawoosh(true);
				// Fully activated, play kawoosh sound
				new Audio('/sounds/stargate-kawoosh.mp3').play().catch((err) => {
					console.error('Failed to play kawoosh sound:', err);
				});

				// Clear the timeout
				if (timer) {
					clearTimeout(timer);
				}
			} else if (activationStage > 0 && activationStage < 8) {
				// Play chevron locking sound for each stage 1-7
				new Audio('/sounds/chevron-lock.mp3').play().catch((err) => {
					console.error('Failed to play chevron sound:', err);
				});

				console.log(`Chevron ${activationStage} locked!`);

				// Continue activation sequence after a delay
				timer = setTimeout(() => {
					if (activationStage < 7) {
						advanceStage();
					} else {
						// After the 7th chevron, trigger the final activation with a bit longer delay
						setTimeout(() => advanceStage(), 1500);
					}
				}, 1000);
			}
		} else if (!isActive && activationStage > 0) {
			// Handle deactivation
			console.log('Shutting down stargate');
			setIsShuttingDown(true);
			new Audio('/sounds/stargate-shutdown.mp3').play().catch(err => console.error('Failed to play shutdown sound:', err));

			// Reset after a delay
			timer = setTimeout(() => {
				setActivationStage(0);
				onStageChange(0);
				onDeactivate();
				setIsShuttingDown(false);
			}, 2000);
		}

		// Cleanup timer on unmount or state change
		return () => {
			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [
		isActive,
		activationStage,
		isTraveling,
		onStageChange,
		onDeactivate,
		onTravel,
		advanceStage,
	]);

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
		<Stargate
			position={position}
			isActive={isActive}
			activationStage={activationStage}
			isShuttingDown={isShuttingDown}
			onActivationStageChange={handleActivationStageChange}
		/>
	);
};
