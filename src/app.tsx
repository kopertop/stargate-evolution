import React, { useRef, useState, createContext, useContext, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import StargateRoom from './components/stargate-room';
import CameraController from './components/camera-controller';
import MovementTutorial from './components/movement-tutorial';
import StargateWormholeEffect from './components/stargate-travel-effect';
import WormholeOverlay from './components/wormhole-overlay';
import HelpReminder from './components/help-reminder';
import { Planets } from './types/index';
import { initializeGameData } from './data';

// Create a context for location information
interface LocationContextType {
	planet: Planets;
	location: string;
	updateLocation: (planet: Planets, location: string) => void;
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

// Character reference context
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

	const [currentPlanet, setCurrentPlanet] = useState<Planets>('Earth');
	const [currentLocation, setCurrentLocation] = useState<string>('Stargate Command');
	const [isInWormhole, setIsInWormhole] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [initError, setInitError] = useState<string | null>(null);

	// Initialize the database
	useEffect(() => {
		async function init() {
			try {
				setIsLoading(true);
				await initializeGameData();
				console.log('Database initialized successfully');
				setIsLoading(false);
			} catch (error) {
				console.error('Failed to initialize database:', error);
				setInitError('Failed to initialize game data. Please refresh the page.');
				setIsLoading(false);
			}
		}

		init();
	}, []);

	// Update location handler
	const updateLocation = (planet: Planets, location: string) => {
		setCurrentPlanet(planet);
		setCurrentLocation(location);
	};

	// Handler for wormhole state
	const handleWormholeState = (isInWormhole: boolean) => {
		console.log('Setting wormhole state:', isInWormhole);
		setIsInWormhole(isInWormhole);
	};

	// Dummy startTravel function for the context
	const startTravel = () => {
		console.log('Travel starting from context handler');
	};

	// Show loading screen while initializing
	if (isLoading) {
		return (
			<div className="loading-screen">
				<h2>Initializing Stargate Systems...</h2>
				<div className="loading-spinner"></div>
			</div>
		);
	}

	// Show error if initialization failed
	if (initError) {
		return (
			<div className="error-screen">
				<h2>Error</h2>
				<p>{initError}</p>
				<button onClick={() => window.location.reload()}>Retry</button>
			</div>
		);
	}

	return (
		<LocationContext.Provider
			value={{
				planet: currentPlanet,
				location: currentLocation,
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
							onComplete={() => {
								// This is now handled directly in the StargateRoom component
							}}
							duration={2500}
						/>

						{/* Room and environment (hide during wormhole travel) */}
						{!isInWormhole && (
							<StargateRoom
								planet={currentPlanet}
								characterRef={characterRef}
								updateLocation={updateLocation}
								setIsInWormhole={handleWormholeState}
								startTravel={startTravel}
							/>
						)}

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
