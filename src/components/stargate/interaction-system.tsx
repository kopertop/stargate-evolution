import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useInteractionStore } from './interaction-store';
import { useStargateStore } from './stargate-store';

// Define interaction distances
const DHD_INTERACTION_DISTANCE = 2;
const STARGATE_INTERACTION_DISTANCE = 4;
const TRAVEL_DISTANCE = 3;
const INTERACTION_HINT_DISTANCE = 5;

export interface InteractionSystemProps {
	characterRef: React.RefObject<THREE.Group>;
	stargatePositionRef: React.RefObject<THREE.Vector3>;
	dhdPositionRef: React.RefObject<THREE.Vector3>;
	stargateActive: boolean;
	activationStage: number;
	setInteractionHint: (hint: string) => void;
	setInteractableObject: (object: string | null) => void;
	interactionHint: string;
	interactableObject: string | null;
	onDHDInteract: () => void;
	onStartTravel: () => void;
}

export const InteractionSystem: React.FC<InteractionSystemProps> = ({
	characterRef,
	stargatePositionRef,
	dhdPositionRef,
	stargateActive,
	activationStage,
	setInteractionHint,
	setInteractableObject,
	interactionHint,
	interactableObject,
	onDHDInteract,
	onStartTravel
}) => {
	const {
		setIsNearDHD,
		setIsNearStargate,
		setInteractionHint: setStoreInteractionHint,
		setInteractableObject: setStoreInteractableObject
	} = useInteractionStore();

	// Get the stargate store to ensure we're using the correct state
	const stargateStore = useStargateStore();

	// Process interactions every frame
	useFrame(() => {
		if (!characterRef.current || !stargatePositionRef.current || !dhdPositionRef.current) return;

		const characterPosition = characterRef.current.position;
		const stargatePosition = stargatePositionRef.current;
		const dhdPosition = dhdPositionRef.current;

		// Calculate distances
		const distanceToDHD = characterPosition.distanceTo(new THREE.Vector3(
			dhdPosition.x,
			characterPosition.y, // Use character's y position for a more accurate horizontal distance
			dhdPosition.z
		));

		const distanceToStargate = characterPosition.distanceTo(new THREE.Vector3(
			stargatePosition.x,
			characterPosition.y, // Use character's y position for a more accurate horizontal distance
			stargatePosition.z
		));

		// Check if player is near the DHD
		const nearDHD = distanceToDHD < DHD_INTERACTION_DISTANCE;
		setIsNearDHD(nearDHD);

		// Check if player is near the Stargate
		const nearStargate = distanceToStargate < STARGATE_INTERACTION_DISTANCE;
		setIsNearStargate(nearStargate);

		// Get the current activation stage from the store to ensure accuracy
		const stargateFullyActive = stargateActive && (stargateStore.activationStage === 9 || activationStage === 9);

		// Determine interaction hints
		if (nearDHD && nearStargate) {
			// DHD interaction takes priority unless we're very close to fully active stargate
			if (stargateFullyActive && distanceToStargate < TRAVEL_DISTANCE) {
				// Approaching an active stargate - show a passive info message
				const hint = 'Move closer to travel through the Stargate';
				setInteractableObject(null);
				setStoreInteractableObject(null);

				if (interactionHint !== hint) {
					setInteractionHint(hint);
					setStoreInteractionHint(hint);
				}
			} else {
				setInteractableObject('dhd');
				setStoreInteractableObject('dhd');

				if (stargateActive) {
					const hint = 'Press SPACE to deactivate the Stargate';
					if (interactionHint !== hint) {
						setInteractionHint(hint);
						setStoreInteractionHint(hint);
					}
				} else {
					const hint = 'Press SPACE to activate the Stargate';
					if (interactionHint !== hint) {
						setInteractionHint(hint);
						setStoreInteractionHint(hint);
					}
				}
			}
		} else if (nearDHD) {
			setInteractableObject('dhd');
			setStoreInteractableObject('dhd');

			if (stargateActive) {
				const hint = 'Press SPACE to deactivate the Stargate';
				if (interactionHint !== hint) {
					setInteractionHint(hint);
					setStoreInteractionHint(hint);
				}
			} else {
				const hint = 'Press SPACE to activate the Stargate';
				if (interactionHint !== hint) {
					setInteractionHint(hint);
					setStoreInteractionHint(hint);
				}
			}
		} else if (stargateFullyActive) {
			// Only show travel hints if the stargate is fully active (stage 9)
			if (distanceToStargate < INTERACTION_HINT_DISTANCE) {
				if (distanceToStargate < TRAVEL_DISTANCE) {
					// Within travel distance - travel will happen automatically
					const hint = 'Moving through the Stargate...';
					setInteractableObject(null);
					setStoreInteractableObject(null);

					if (interactionHint !== hint) {
						setInteractionHint(hint);
						setStoreInteractionHint(hint);
					}
				} else {
					// Show hint to approach stargate
					const hint = 'Walk closer to the Stargate to travel';
					setInteractableObject(null);
					setStoreInteractableObject(null);

					if (interactionHint !== hint) {
						setInteractionHint(hint);
						setStoreInteractionHint(hint);
					}
				}
			} else {
				if (interactionHint !== '') {
					setInteractionHint('');
					setStoreInteractionHint('');
				}
				setInteractableObject(null);
				setStoreInteractableObject(null);
			}
		} else if (stargateActive) {
			// Show information about the stargate's activation status
			if (distanceToStargate < INTERACTION_HINT_DISTANCE) {
				const hint = 'The Stargate is activating...';
				setInteractableObject(null);
				setStoreInteractableObject(null);

				if (interactionHint !== hint) {
					setInteractionHint(hint);
					setStoreInteractionHint(hint);
				}
			} else {
				if (interactionHint !== '') {
					setInteractionHint('');
					setStoreInteractionHint('');
				}
				setInteractableObject(null);
				setStoreInteractableObject(null);
			}
		} else {
			if (interactionHint !== '') {
				setInteractionHint('');
				setStoreInteractionHint('');
			}
			setInteractableObject(null);
			setStoreInteractableObject(null);
		}
	});

	// Handle key press for DHD interaction only
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space') {
				if (interactableObject === 'dhd') {
					onDHDInteract();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [interactableObject, onDHDInteract]);

	// This component is purely logic-based, no visual output
	return null;
};
