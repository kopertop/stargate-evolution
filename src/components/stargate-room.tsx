import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Planets } from '../types/index';
import StargateController from './stargate/stargate-controller';
import { travel as travelThroughStargate } from './stargate/travel-system';
import { InteractionSystem } from './stargate/interaction-system';
import SimpleCharacterController from './simple-character-controller';
import Room from './assets/room';
import DHD from './assets/dhd';

interface StargateRoomProps {
	planet: Planets;
	characterRef: React.RefObject<THREE.Group | null>;
	updateLocation: (planet: Planets, location: string) => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
	startTravel: () => void;
}

const StargateRoom: React.FC<StargateRoomProps> = ({
	planet,
	characterRef,
	updateLocation,
	setIsInWormhole,
	startTravel
}) => {
	// Local state for position tracking
	const stargatePositionRef = useRef(new THREE.Vector3(0, 0, -10));
	const dhdPositionRef = useRef(new THREE.Vector3(5, 0, 0));

	// Stargate state
	const [stargateActive, setStargateActive] = useState(false);
	const [stargateActivationStage, setStargateActivationStage] = useState(0);
	const hasEnteredGateRef = useRef(false);
	const stargateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Set up camera
	const { camera } = useThree();

	// Set initial camera position
	useEffect(() => {
		camera.position.set(0, 5, 10);
		camera.lookAt(0, 0, 0);
	}, [camera]);

	// Set up room theme based on planet
	const roomTheme = {
		wallColor: planet === 'Earth' ? '#555555' : '#AA8855',
		floorColor: planet === 'Earth' ? '#444444' : '#8A6642'
	};

	// Clean up any timeouts when unmounting
	useEffect(() => {
		return () => {
			if (stargateTimeoutRef.current) {
				clearTimeout(stargateTimeoutRef.current);
			}
		};
	}, []);

	// Handle interactions with objects
	const handleInteraction = (target: string) => {
		if (target === 'dhd') {
			if (!stargateActive) {
				// Activate the DHD first
				console.log('Dialing stargate...');

				// Then activate the stargate with a delay
				setStargateActive(true);

				// Auto-shutdown timer
				if (stargateTimeoutRef.current) {
					clearTimeout(stargateTimeoutRef.current);
				}

				stargateTimeoutRef.current = setTimeout(() => {
					if (stargateActive) {
						console.log('Auto shutting down stargate after timeout');
						setStargateActive(false);
					}
				}, 20000); // Shutdown after 20 seconds if not used
			} else {
				// Deactivate the stargate
				console.log('Shutting down stargate...');
				setStargateActive(false);

				// Clear auto-shutdown timer
				if (stargateTimeoutRef.current) {
					clearTimeout(stargateTimeoutRef.current);
					stargateTimeoutRef.current = null;
				}
			}
		} else if (target === 'stargate' && stargateActive && stargateActivationStage === 4) {
			// Initiate travel
			console.log('Traveling through stargate...');

			// Set wormhole effect to true
			setIsInWormhole(true);

			// Get destination planet
			const nextPlanet = planet === 'Earth' ? 'Abydos' : 'Earth';
			const nextLocation = nextPlanet === 'Earth' ? 'Stargate Command' : 'Temple of Ra';

			// Trigger the shutdown animation
			const shutdownEvent = new CustomEvent('stargate-shutdown', {
				detail: { duration: 3000 } // 3 seconds shutdown animation
			});
			window.dispatchEvent(shutdownEvent);

			// After a delay, update the location
			setTimeout(() => {
				updateLocation(nextPlanet, nextLocation);
				setIsInWormhole(false);
			}, 2500);

			// Deactivate stargate and clear timeout
			setStargateActive(false);
			if (stargateTimeoutRef.current) {
				clearTimeout(stargateTimeoutRef.current);
				stargateTimeoutRef.current = null;
			}
		}
	};

	// Handle when stargate activation stage changes
	const handleActivationStageChange = (stage: number) => {
		setStargateActivationStage(stage);
		console.log(`StargateRoom: Activation stage changed to ${stage}`);
	};

	// Handle DHD activation
	const handleDHDActivate = () => {
		handleInteraction('dhd');
	};

	return (
		<>
			{/* Scene setup */}
			<ambientLight intensity={0.3} />
			<directionalLight position={[10, 10, 5]} intensity={0.7} />

			{/* Room environment */}
			<Room
				size={[20, 20]}
				wallHeight={5}
				wallColor={roomTheme.wallColor}
				floorColor={roomTheme.floorColor}
			/>

			{/* Character with controller */}
			<SimpleCharacterController ref={characterRef} speed={0.15} />

			{/* Stargate */}
			<StargateController
				position={[0, 1.8, -10]}
				isActive={stargateActive}
				onActivationStageChange={handleActivationStageChange}
			/>

			{/* DHD */}
			<DHD
				position={[5, 0, 0]}
				isActive={stargateActive}
				onActivate={handleDHDActivate}
			/>

			{/* Interaction system */}
			<InteractionSystem
				characterRef={characterRef as any}
				stargatePosition={stargatePositionRef.current}
				dhdPosition={dhdPositionRef.current}
				stargateActive={stargateActive}
				stargateActivationStage={stargateActivationStage}
				currentPlanet={planet}
				onInteraction={handleInteraction}
			/>

			{/* Limited orbital controls - will be controlled by keyboard */}
			<OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
		</>
	);
};

export default StargateRoom;
