import React, { useRef, useState, useEffect } from 'react';
import Stargate from '../assets/stargate';
import TravelSystem from './travel-component';

export interface StargateControllerProps {
	position?: [number, number, number];
	destination?: string;
	isActive?: boolean;
	onActivate?: () => void;
	onDeactivate?: () => void;
	onStageChange?: (stage: number) => void;
	onTravel?: () => void;
	isTraveling?: boolean;
	setIsInWormhole?: (isInWormhole: boolean) => void;
}

// Export triggerGateShutdown function
export const triggerGateShutdown = (duration = 2000): void => {
	console.log(`Triggering global stargate shutdown animation (${duration}ms)`);
	const shutdownEvent = new CustomEvent('stargate-shutdown', {
		detail: { duration }
	});
	window.dispatchEvent(shutdownEvent);
};

export const StargateController: React.FC<StargateControllerProps> = ({
	position = [0, 0, 0],
	destination = 'Unknown',
	isActive = false,
	onActivate = () => {},
	onDeactivate = () => {},
	onStageChange = () => {},
	onTravel = () => {},
	isTraveling = false,
	setIsInWormhole = () => {}
}) => {
	const [activationStage, setActivationStage] = useState(0);
	const isMounted = useRef(true);

	// Clear any timeouts on unmount
	useEffect(() => {
		// Log initial state
		console.log(`StargateController mounted with isActive=${isActive}, activationStage=${activationStage}`);

		return () => {
			console.log('StargateController unmounting');
			isMounted.current = false;
		};
	}, []);

	// Handle activation stage changes
	const handleActivationStageChange = (stage: number) => {
		console.log(`StargateController: Activation stage changed to ${stage}`);
		setActivationStage(stage);
		onStageChange(stage);
	};

	// Reset to inactive state
	const resetToInactive = () => {
		if (!isMounted.current) return;

		console.log('StargateController: Resetting to inactive state');
		setActivationStage(0);
		onStageChange(0);

		// Notify parent about deactivation
		onDeactivate();
	};

	// Trigger shutdown animation with custom event
	const triggerShutdown = (duration = 2000) => {
		console.log(`Triggering stargate shutdown animation (${duration}ms)`);

		// Dispatch custom event for stargate shutdown
		const shutdownEvent = new CustomEvent('stargate-shutdown', {
			detail: { duration }
		});
		window.dispatchEvent(shutdownEvent);

		// Give time for the shutdown animation to complete
		setTimeout(() => {
			if (isMounted.current) {
				resetToInactive();
			}
		}, duration + 100); // Add slight delay to ensure animation completes
	};

	// Handle deactivation
	useEffect(() => {
		if (!isActive && activationStage > 0) {
			console.log('StargateController: isActive changed to false while active - triggering shutdown');
			triggerShutdown();
		}
	}, [isActive, activationStage]);

	return (
		<group position={position}>
			<Stargate
				isActive={isActive}
				onActivationStageChange={handleActivationStageChange}
			/>

			{/* Travel effects only shown when fully activated */}
			{activationStage >= 4 && (
				<TravelSystem
					isActive={isActive}
					isTraveling={isTraveling}
					destination={destination}
					onTravel={onTravel}
					setIsInWormhole={setIsInWormhole}
				/>
			)}
		</group>
	);
};
