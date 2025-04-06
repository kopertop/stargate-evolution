import * as THREE from 'three';
import { Planets } from '../../types/index';

export interface TravelSystemState {
	characterPosition: THREE.Vector3;
	stargatePosition: THREE.Vector3;
	activePlanet: Planets;
	stargateActive: boolean;
	stargateActivationStage: number;
}

/**
 * Checks if a character is near enough to a stargate to trigger travel
 */
export const checkStargateProximity = (state: TravelSystemState): boolean => {
	// Check if the stargate is fully activated (stage 4) before allowing travel
	if (!state.stargateActive || state.stargateActivationStage < 4) {
		console.log(`Travel not possible: stargateActive=${state.stargateActive}, activationStage=${state.stargateActivationStage}`);
		return false;
	}

	// Calculate 2D distance (ignoring height) for proximity check
	const xDist = state.characterPosition.x - state.stargatePosition.x;
	const zDist = state.characterPosition.z - state.stargatePosition.z;
	const distance = Math.sqrt(xDist * xDist + zDist * zDist);

	// Check if the character is close enough to the stargate to travel
	const isCloseEnough = distance < 2.5;

	if (isCloseEnough) {
		console.log(`Character is close enough to travel (distance: ${distance.toFixed(2)})`);
	}

	return isCloseEnough;
};

/**
 * Updates interaction hints based on character position relative to stargate
 */
export const updateStargateHints = (
	characterPosition: THREE.Vector3,
	stargatePosition: THREE.Vector3,
	stargateActive: boolean,
	interactionHint: string,
	interactableObject: string | null,
	setInteractionHint: (hint: string) => void
) => {
	// Calculate distance to stargate
	const horizontalDistance = Math.sqrt(
		Math.pow(characterPosition.x - stargatePosition.x, 2) +
		Math.pow(characterPosition.z - stargatePosition.z, 2)
	);

	// Distance in front/behind the gate
	const distanceInFrontOfGate = characterPosition.z - stargatePosition.z;

	// Check if stargate is active and character is approaching it from the front
	if (stargateActive && horizontalDistance < 5 && distanceInFrontOfGate > -5 && distanceInFrontOfGate < 5) {
		// Only show the hint if we're not already showing it and not showing DHD hint
		if (interactionHint !== 'Walk through the event horizon to travel' &&
			interactableObject !== 'dhd') {
			setInteractionHint('Walk through the event horizon to travel');
		}
	} else if (interactionHint === 'Walk through the event horizon to travel' &&
			  (horizontalDistance >= 5 || distanceInFrontOfGate <= -5 || distanceInFrontOfGate >= 5)) {
		// Clear the walk-through hint when moving away
		if (interactableObject !== 'dhd') {
			setInteractionHint('');
		}
	}
};

/**
 * Triggers stargate shutdown with animation via custom event
 */
export const triggerGateShutdown = (duration = 2000) => {
	console.log(`Initiating stargate shutdown sequence (${duration}ms)`);

	// Create and dispatch a custom event
	const shutdownEvent = new CustomEvent('stargate-shutdown', {
		detail: { duration }
	});

	window.dispatchEvent(shutdownEvent);
};

/**
 * Executes the travel sequence between planets
 */
export const executeTravel = (
	currentPlanet: Planets,
	updateLocation: (planet: Planets, location: string) => void,
	setStargateActive: (active: boolean) => void,
	setIsInWormhole: (inWormhole: boolean) => void,
	characterRef: React.RefObject<THREE.Group | null>
) => {
	// Where are we going?
	const destination = currentPlanet === 'Earth' ? 'Abydos' : 'Earth';
	console.log(`Travel sequence initiated! Destination: ${destination}`);

	// Mark that we're traveling through the stargate for arrival animation
	sessionStorage.setItem('arrived-through-gate', 'true');

	// Set travel flag to show wormhole effect
	setIsInWormhole(true);

	// After the wormhole effect completes, set the new planet location
	setTimeout(() => {
		// Update the location
		updateLocation(
			destination as Planets,
			destination === 'Earth' ? 'Stargate Command' : 'Temple of Ra'
		);

		// Ensure the stargate appears active on arrival
		setStargateActive(true);
		console.log(`Arrived at ${destination}`);

		// End wormhole travel effect
		setIsInWormhole(false);

		// After a delay, start the gate shutdown animation
		setTimeout(() => {
			console.log('Starting shutdown sequence');
			triggerGateShutdown();
		}, 3000);
	}, 2500);
};

/**
 * Initiates travel to another planet through the stargate
 */
export const travel = (currentPlanet: Planets): Planets => {
	console.log(`Initiating travel from ${currentPlanet}`);

	// Simple toggle between planets
	const nextPlanet = currentPlanet === 'Earth' ? 'Abydos' : 'Earth';

	// Trigger the shutdown animation when traveling
	triggerGateShutdown(3000); // 3 seconds shutdown animation

	console.log(`Travel destination: ${nextPlanet}`);
	return nextPlanet;
};
