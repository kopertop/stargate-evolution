import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Stargate } from '../assets';
import { Planets } from '../../types/index';
import { useThree } from '@react-three/fiber';

interface StargateControllerProps {
	isActive: boolean;
	position: [number, number, number];
	onGateReady?: () => void;
	onActivationStageChange: (stage: number) => void;
}

const StargateController: React.FC<StargateControllerProps> = ({
	isActive,
	position,
	onGateReady,
	onActivationStageChange
}) => {
	const stargatePositionRef = useRef(new THREE.Vector3(position[0], position[1], position[2]));
	const [activationStage, setActivationStage] = useState(0);
	const [isActivating, setIsActivating] = useState(false);
	const activationTimerRef = useRef<NodeJS.Timeout | null>(null);
	const previousIsActiveRef = useRef<boolean>(false);

	useEffect(() => {
		console.log(`StargateController: isActive=${isActive}, activationStage=${activationStage}, isActivating=${isActivating}`);

		// Clear any existing timer when props change
		if (activationTimerRef.current) {
			clearTimeout(activationTimerRef.current);
			activationTimerRef.current = null;
		}

		// Only start activation if we're going from inactive to active
		if (isActive && !previousIsActiveRef.current && !isActivating) {
			setIsActivating(true);
			console.log('StargateController: Starting activation sequence');

			// Reset to ensure we start from beginning
			setActivationStage(0);
			onActivationStageChange(0);

			// Start the activation sequence with a slight delay
			activationTimerRef.current = setTimeout(() => {
				setActivationStage(1);
				onActivationStageChange(1);
				console.log('StargateController: Activation stage changed to 1');
				activationTimerRef.current = null;
			}, 500);
		}
		// Handle deactivation
		else if (!isActive && previousIsActiveRef.current) {
			console.log('StargateController: Resetting to inactive state');
			setIsActivating(false);
			setActivationStage(0);
			onActivationStageChange(0);
		}

		previousIsActiveRef.current = isActive;
	}, [isActive, onActivationStageChange]);

	// Handle activation stage changes that come from the Stargate component
	const handleActivationStageChange = (stage: number) => {
		if (stage !== activationStage) {
			console.log(`StargateController: Activation stage changed to ${stage}`);
			setActivationStage(stage);
			onActivationStageChange(stage);

			// Reset activating flag when we reach stage 4 (fully activated)
			if (stage === 4) {
				setIsActivating(false);
			}
		}
	};

	return (
		<Stargate
			position={position}
			isActive={isActive}
			noCollide={true}
			onActivate={() => {}}
			onActivationStageChange={handleActivationStageChange}
		/>
	);
};

// Utility function to trigger stargate shutdown
export const triggerGateShutdown = (duration: number = 2000) => {
	console.log(`Initiating stargate shutdown sequence (${duration}ms)`);

	// Create and dispatch a custom event
	const shutdownEvent = new CustomEvent('stargate-shutdown', {
		detail: { duration }
	});

	window.dispatchEvent(shutdownEvent);
};

export default StargateController;
