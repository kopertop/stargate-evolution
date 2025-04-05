import React, { useRef, useState, createContext, useContext } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import StargateRoom from './components/stargate-room';
import CameraController from './components/camera-controller';
import MovementTutorial from './components/movement-tutorial';
import StargateWormholeEffect from './components/stargate-travel-effect';
import WormholeOverlay from './components/wormhole-overlay';
import HelpReminder from './components/help-reminder';

// Create a context for location information
interface LocationContextType {
	planet: string;
	location: string;
	updateLocation: (planet: string, location: string) => void;
	startTravel: () => void;
	isInWormhole: boolean;
}

export const LocationContext = createContext<LocationContextType>({
	planet: 'Earth',
	location: 'Stargate Command',
	updateLocation: () => {},
	startTravel: () => {},
	isInWormhole: false
});

// Hook to easily access and update location
export const useLocation = () => useContext(LocationContext);

// Location display component
const LocationDisplay = () => {
	const { planet, location, isInWormhole } = useLocation();

	// Don't show location during wormhole travel
	if (isInWormhole) return null;

	return (
		<div className="game-ui">
			<h3>{planet} - {location}</h3>
		</div>
	);
};

// Create a context for sharing the character reference
interface CharacterRefContextType {
	characterRef: React.RefObject<THREE.Group | null>;
}

export const CharacterRefContext = createContext<CharacterRefContextType>({
	characterRef: { current: null }
});

// Hook to easily access the character reference
export const useCharacterRef = () => useContext(CharacterRefContext);

export default function App() {
	// Character reference that will be provided by StargateRoom
	const characterRef = useRef<THREE.Group>(null);

	const [locationInfo, setLocationInfo] = useState({
		planet: 'Earth',
		location: 'Stargate Command'
	});
	const [isInWormhole, setIsInWormhole] = useState(false);
	const [destinationInfo, setDestinationInfo] = useState<{planet: string, location: string} | null>(null);

	// Function to update location that can be called from game logic
	const updateLocation = (planet: string, location: string) => {
		// When traveling through the wormhole, store the destination
		// but don't update the displayed location until after the effect
		if (isInWormhole) {
			setDestinationInfo({ planet, location });
		} else {
			setLocationInfo({ planet, location });
		}
	};

	// Function to start the wormhole travel effect
	const startTravel = () => {
		setIsInWormhole(true);
	};

	// Function called when the wormhole effect completes
	const handleTravelComplete = () => {
		setIsInWormhole(false);

		// Update to the destination location if one was set
		if (destinationInfo) {
			setLocationInfo(destinationInfo);
			setDestinationInfo(null);
		}
	};

	return (
		<LocationContext.Provider
			value={{
				planet: locationInfo.planet,
				location: locationInfo.location,
				updateLocation,
				startTravel,
				isInWormhole
			}}
		>
			<CharacterRefContext.Provider value={{ characterRef }}>
				<div style={{ width: '100vw', height: '100vh', backgroundColor: '#111' }}>
					{/* DOM-based wormhole overlay effects */}
					<WormholeOverlay />

					{/* Movement tutorial (hide during wormhole travel) */}
					{!isInWormhole && <MovementTutorial />}

					{/* Location info */}
					<LocationDisplay />

					{/* Help Button - always visible */}
					<HelpReminder />

					{/* Main 3D Canvas */}
					<Canvas shadows>
						{/* Lighting */}
						<ambientLight intensity={0.3} />
						<directionalLight
							position={[10, 15, 5]}
							intensity={1}
							castShadow
							shadow-mapSize-width={2048}
							shadow-mapSize-height={2048}
							shadow-camera-far={50}
							shadow-camera-left={-20}
							shadow-camera-right={20}
							shadow-camera-top={20}
							shadow-camera-bottom={-20}
						/>

						{/* Wormhole travel effect (shown only when traveling) */}
						<StargateWormholeEffect
							active={isInWormhole}
							onComplete={handleTravelComplete}
							duration={5} // 5 seconds of travel
						/>

						{/* Room and environment (hide during wormhole travel) */}
						{!isInWormhole && <StargateRoom />}

						{/* Camera that follows the character */}
						<CameraController
							target={characterRef}
							offset={[0, 3, 6]}
							lerp={0.1}
						/>
					</Canvas>
				</div>
			</CharacterRefContext.Provider>
		</LocationContext.Provider>
	);
}
