import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StargateController } from '../stargate';
import { Planets } from '../../types';
import { InteractionSystem } from '../stargate';
import { SimpleCharacterController } from '../character/simple-character-controller';
import { DHDController } from '../dhd';

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

		{/* Walls */}
		<mesh position={[0, wallHeight / 2, -size[1] / 2]} receiveShadow>
			<boxGeometry args={[size[0], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} />
		</mesh>
		<mesh position={[0, wallHeight / 2, size[1] / 2]} receiveShadow>
			<boxGeometry args={[size[0], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} />
		</mesh>
		<mesh position={[-size[0] / 2, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
			<boxGeometry args={[size[1], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} />
		</mesh>
		<mesh position={[size[0] / 2, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
			<boxGeometry args={[size[1], wallHeight, 0.2]} />
			<meshStandardMaterial color={wallColor} />
		</mesh>
	</group>
);

export interface StargateRoomProps {
	planet: Planets;
	updateLocation: (planet: Planets, location: string) => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
	characterRef?: React.RefObject<THREE.Group | null>;
	startTravel?: () => void;
}

const StargateRoom: React.FC<StargateRoomProps> = ({
	planet,
	updateLocation,
	setIsInWormhole,
	characterRef: externalCharacterRef,
	startTravel: externalStartTravel,
}) => {
	const [stargateActive, setStargateActive] = useState(false);
	const [activationStage, setActivationStage] = useState(0);
	const [isTraveling, setIsTraveling] = useState(false);
	const [interactionHint, setInteractionHint] = useState('');
	const [interactableObject, setInteractableObject] = useState<string | null>(null);

	const localCharacterRef = useRef<THREE.Group>(null);
	const characterRef = externalCharacterRef || localCharacterRef;
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
		if (externalStartTravel) {
			externalStartTravel();
			return;
		}

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
			<SimpleCharacterController
				ref={characterRef}
				speed={0.05}
				roomDimensions={{ size: [20, 20], wallHeight: 5 }}
				stargatePosition={stargatePositionRef.current}
				dhdPosition={dhdPositionRef.current}
			/>

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
			<DHDController
				position={[5, 0, 0]}
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
				onStartTravel={startTravel}
			/>

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
