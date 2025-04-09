import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StargateController } from '../stargate';
import { Planets } from '../../types';
import { InteractionSystem } from '../stargate';
import { SimpleCharacterController } from '../character/simple-character-controller';
import { DHDController } from '../dhd';
import { useInteractionStore } from '../stargate/interaction-store';
import { usePlayerStore } from '../player';
import { TravelController } from '../player/travel-controller';

// Temporary Room component until we move the actual one
const Room: React.FC<{size: [number, number], wallHeight: number, wallColor: string, floorColor: string}> = ({
	size, wallHeight, wallColor, floorColor
}) => (
	<group>
		{/* Floor */}
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
			<planeGeometry args={size} />
			<meshStandardMaterial color={floorColor} />
		</mesh>

		{/* Walls - with clear names for detection */}
		<mesh
			position={[0, wallHeight / 2, -size[1] / 2]}
			receiveShadow
			name="wall-north"
		>
			<boxGeometry args={[size[0], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} transparent opacity={1} />
		</mesh>
		<mesh
			position={[0, wallHeight / 2, size[1] / 2]}
			receiveShadow
			name="wall-south"
		>
			<boxGeometry args={[size[0], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} transparent opacity={1} />
		</mesh>
		<mesh
			position={[-size[0] / 2, wallHeight / 2, 0]}
			rotation={[0, Math.PI / 2, 0]}
			receiveShadow
			name="wall-west"
		>
			<boxGeometry args={[size[1], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} transparent opacity={1} />
		</mesh>
		<mesh
			position={[size[0] / 2, wallHeight / 2, 0]}
			rotation={[0, Math.PI / 2, 0]}
			receiveShadow
			name="wall-east"
		>
			<boxGeometry args={[size[1], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} transparent opacity={1} />
		</mesh>
	</group>
);

export interface StargateRoomProps {
	planet: Planets;
	updateLocation?: (planet: Planets, location: string) => void;
	setIsInWormhole?: (isInWormhole: boolean) => void;
	characterRef?: React.RefObject<THREE.Group | null>;
	startTravel?: () => void;
}

const StargateRoom: React.FC<StargateRoomProps> = ({
	planet,
	updateLocation,
	setIsInWormhole: legacySetIsInWormhole,
	characterRef: externalCharacterRef,
	startTravel: externalStartTravel,
}) => {
	const [stargateActive, setStargateActive] = useState(false);
	const [activationStage, setActivationStage] = useState(0);

	// Get player store for location and travel
	const { travel, setIsInWormhole, currentPlanet, currentLocation } = usePlayerStore();

	// Get interaction store for hints and interactions
	const {
		interactionHint,
		interactableObject,
		setInteractionHint,
		setInteractableObject
	} = useInteractionStore();

	const localCharacterRef = useRef<THREE.Group>(null);
	const characterRef = externalCharacterRef || localCharacterRef;
	const stargateRef = useRef<THREE.Group>(null);
	const stargatePositionRef = useRef(new THREE.Vector3(0, 2, -5));
	const dhdPositionRef = useRef(new THREE.Vector3(5, 0.5, 0));

	// Auto-shutdown timer
	const shutdownTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Determine target planet/location based on current location
	const targetPlanet = planet === 'Earth' ? 'Abydos' : 'Earth';
	const targetLocation = targetPlanet === 'Earth' ? 'Stargate Command' : 'Temple of Ra';

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
		? { wallColor: '#777777', floorColor: '#555555' }
		: { wallColor: '#AA8866', floorColor: '#BB9977' };

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
			if (stargateActive) {
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

		if (stage === 8) {
			setInteractionHint('Stargate activated! Walk through to travel.');
		} else if (stage === 0) {
			setInteractionHint('');
		} else if (stage > 0 && stage < 8) {
			setInteractionHint(`Chevron ${stage} locked!`);
		}
	};

	// Handle stargate deactivation
	const handleStargateDeactivation = () => {
		console.log('Stargate deactivated');
		setStargateActive(false);
		setActivationStage(0);
	};

	// Handle travel completion - use both new and legacy methods
	const handleTravelComplete = () => {
		console.log('Travel completed to:', targetPlanet, targetLocation);

		// Call legacy update if provided
		if (updateLocation) {
			updateLocation(targetPlanet, targetLocation);
		}

		// Call legacy wormhole setter if provided
		if (legacySetIsInWormhole) {
			legacySetIsInWormhole(false);
		}

		// Reset stargate state
		setStargateActive(false);
		setActivationStage(0);
	};

	// Update position refs when component mounts
	useEffect(() => {
		stargatePositionRef.current.set(0, 2, -5);
		dhdPositionRef.current.set(5, 0.5, 0);
	}, []);

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
			<SimpleCharacterController
				ref={characterRef}
				speed={0.25}
				roomDimensions={{ size: [20, 20], wallHeight: 5 }}
				stargatePosition={stargatePositionRef.current}
				dhdPosition={dhdPositionRef.current}
			/>

			{/* Stargate with controller */}
			<StargateController
				position={[0, 2, -5]}
				destination={targetPlanet}
				isActive={stargateActive}
				onDeactivate={handleStargateDeactivation}
				onStageChange={handleStargateStageChange}
				onTravel={handleTravelComplete}
				isTraveling={false}
				setIsInWormhole={setIsInWormhole}
				ref={stargateRef}
			/>

			{/* DHD (Dial Home Device) */}
			<DHDController
				position={[5, 0.5, 0]}
				isActive={stargateActive}
				onActivate={handleDHDInteraction}
				interactableObject={interactableObject}
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
				onStartTravel={() => {}}
			/>

			{/* Travel controller */}
			{characterRef.current && stargateRef.current && (
				<TravelController
					characterRef={characterRef as React.RefObject<THREE.Group>}
					stargateRef={stargateRef}
					stargateActive={stargateActive}
					activationStage={activationStage}
					targetPlanet={targetPlanet}
					targetLocation={targetLocation}
					onTravelComplete={handleTravelComplete}
				/>
			)}

			{/* Ambient light */}
			<ambientLight intensity={0.6} />

			{/* Point lights */}
			<pointLight position={[0, 3, 0]} intensity={0.8} />
			<pointLight position={[0, 3, -5]} intensity={0.5} color={stargateActive ? '#00aaff' : '#ffffff'} />

			{/* Additional lights for better room illumination */}
			<pointLight position={[5, 4, 5]} intensity={0.6} />
			<pointLight position={[-5, 4, 5]} intensity={0.6} />
			<pointLight position={[0, 4, 8]} intensity={0.5} />

			{/* Subtle fill light from below for better shadows */}
			<pointLight position={[0, 0.5, 0]} intensity={0.2} color="#ffffff" />
		</>
	);
};

export default StargateRoom;
