import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { StargateController } from './stargate/stargate-controller';
import { Planets } from '../types';
import { InteractionSystem } from './stargate/interaction-system';
import SimpleCharacterController from './simple-character-controller';
import Room from './assets/room';
import DHD from './assets/dhd';

export interface StargateRoomProps {
	planet: Planets;
	updateLocation: (planet: Planets, location: string) => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
}

const StargateRoom: React.FC<StargateRoomProps> = ({
	planet,
	updateLocation,
	setIsInWormhole,
}) => {
	const [stargateActive, setStargateActive] = useState(false);
	const [activationStage, setActivationStage] = useState(0);
	const [isTraveling, setIsTraveling] = useState(false);
	const [interactionHint, setInteractionHint] = useState('');
	const [interactableObject, setInteractableObject] = useState<string | null>(null);

	const characterRef = useRef<THREE.Group>(null);
	const stargatePositionRef = useRef(new THREE.Vector3(0, 0, -5));
	const dhdPositionRef = useRef(new THREE.Vector3(5, 0, 0));

	// Auto-shutdown timer
	const shutdownTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Clear any timeouts on unmount
	useEffect(() => {
		return () => {
			if (shutdownTimerRef.current) {
				clearTimeout(shutdownTimerRef.current);
			}
		};
	}, []);

	// Set up the room theme based on the planet
	const roomTheme = planet === 'Earth'
		? { wallColor: '#555555', floorColor: '#333333' }
		: { wallColor: '#8B4513', floorColor: '#8B5A2B' };

	// Handle DHD interaction
	const handleDHDInteraction = () => {
		// If stargate is already active, pressing the DHD again should deactivate it
		if (stargateActive) {
			console.log('Deactivating stargate via DHD');
			setStargateActive(false);
			setInteractionHint('');
			return;
		}

		console.log('Activating stargate via DHD');
		setStargateActive(true);
		setInteractionHint('Stargate activating...');

		// Set an auto-shutdown timer if the stargate isn't used
		if (shutdownTimerRef.current) {
			clearTimeout(shutdownTimerRef.current);
		}

		shutdownTimerRef.current = setTimeout(() => {
			if (!isTraveling && stargateActive) {
				console.log('Auto-shutdown initiated');
				setStargateActive(false);
				setInteractionHint('Stargate shutdown due to inactivity');

				// Clear the hint after a few seconds
				setTimeout(() => {
					if (interactionHint === 'Stargate shutdown due to inactivity') {
						setInteractionHint('');
					}
				}, 3000);
			}
		}, 30000); // 30 seconds until auto-shutdown
	};

	// Handle stargate stage change
	const handleStargateStageChange = (stage: number) => {
		console.log(`Stargate stage changed to ${stage}`);
		setActivationStage(stage);

		if (stage === 4) {
			setInteractionHint('Stargate activated! Walk through to travel.');
		} else if (stage === 0) {
			setInteractionHint('');
		}
	};

	// Handle stargate deactivation
	const handleStargateDeactivation = () => {
		console.log('Stargate deactivated');
		setStargateActive(false);
		setActivationStage(0);
	};

	// Start travel sequence when character approaches active stargate
	const startTravel = () => {
		if (stargateActive && activationStage >= 4 && !isTraveling) {
			console.log('Starting travel sequence');

			// Set traveling state
			setIsTraveling(true);

			// Reset after travel completes (handled by TravelSystem component)
			setTimeout(() => {
				const destination = planet === 'Earth' ? 'Abydos' : 'Earth';
				updateLocation(
					destination as Planets,
					destination === 'Earth' ? 'Stargate Command' : 'Temple of Ra'
				);

				// Reset travel state
				setIsTraveling(false);
			}, 3000);
		}
	};

	return (
		<>
			{/* Room environment */}
			<Room
				size={[20, 20]}
				wallHeight={5}
				wallColor={roomTheme.wallColor}
				floorColor={roomTheme.floorColor}
			/>

			{/* Character */}
			<SimpleCharacterController ref={characterRef} speed={5} />

			{/* Stargate with controller */}
			<StargateController
				position={[0, 0, -5]}
				destination={planet === 'Earth' ? 'Abydos' : 'Earth'}
				isActive={stargateActive}
				onDeactivate={handleStargateDeactivation}
				onStageChange={handleStargateStageChange}
				onTravel={startTravel}
				isTraveling={isTraveling}
				setIsInWormhole={setIsInWormhole}
			/>

			{/* DHD (Dial Home Device) */}
			<DHD
				position={[5, 0, 0]}
				isActive={stargateActive}
				onActivate={handleDHDInteraction}
			/>

			{/* Interaction system */}
			<InteractionSystem
				characterRef={characterRef as React.RefObject<THREE.Group>}
				stargatePositionRef={stargatePositionRef}
				dhdPositionRef={dhdPositionRef}
				stargateActive={stargateActive}
				activationStage={activationStage}
				setInteractionHint={setInteractionHint}
				setInteractableObject={setInteractableObject}
				interactionHint={interactionHint}
				interactableObject={interactableObject}
				onDHDInteract={handleDHDInteraction}
				onStartTravel={startTravel}
			/>

			{/* Ambient light */}
			<ambientLight intensity={0.3} />

			{/* Point lights */}
			<pointLight position={[0, 3, 0]} intensity={0.5} />
			<pointLight position={[0, 3, -5]} intensity={0.3} color={stargateActive ? '#00aaff' : '#ffffff'} />
		</>
	);
};

export default StargateRoom;
