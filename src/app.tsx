import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { GameStateManager, GameLoop, TurnPhase } from './systems';
import CharacterController from './components/character-controller';
import StargateRoom from './components/stargate-room';
import CameraController from './components/camera-controller';
import MovementTutorial from './components/movement-tutorial';

// Basic mesh component for testing
function Box(props: any) {
	const meshRef = useRef<THREE.Mesh>(null!);

	// This effect is just for visuals, not game logic
	useFrame((state: RootState, delta: number) => {
		if (meshRef.current) {
			meshRef.current.rotation.x += delta * 0.2;
		}
	});

	return (
		<mesh
			{...props}
			ref={meshRef}
			scale={1}>
			<boxGeometry args={[1, 1, 1]} />
			<meshStandardMaterial color={'#2f74c0'} />
		</mesh>
	);
}

// Basic planet mesh for visualization
function Planet(props: any) {
	return (
		<mesh {...props}>
			<sphereGeometry args={[1, 32, 32]} />
			<meshStandardMaterial color={props.color || '#208020'} />
		</mesh>
	);
}

export default function App() {
	const [currentPhase, setCurrentPhase] = useState<TurnPhase>(TurnPhase.PLAYER_ACTION);
	const [turnNumber, setTurnNumber] = useState<number>(1);
	const gameLoopRef = useRef<GameLoop | null>(null);
	const [showTradeScreen, setShowTradeScreen] = useState(false);
	const characterRef = useRef<THREE.Mesh>(null);

	// Initialize game systems
	useEffect(() => {
		// Initialize game state and start the game loop
		const gameStateManager = GameStateManager.getInstance();
		const gameLoop = GameLoop.getInstance();
		gameLoopRef.current = gameLoop;

		// Start the game loop with a turn-based approach
		gameLoop.start();

		// Register phase change callbacks to update UI
		const updatePhaseUI = () => {
			setCurrentPhase(gameLoop.getCurrentPhase());
			setTurnNumber(gameLoop.getTurnNumber());
		};

		gameLoop.onPhase(TurnPhase.PLAYER_ACTION, updatePhaseUI);
		gameLoop.onPhase(TurnPhase.ENVIRONMENT, updatePhaseUI);
		gameLoop.onPhase(TurnPhase.ENEMY, updatePhaseUI);
		gameLoop.onPhase(TurnPhase.ALLY, updatePhaseUI);

		// Immediate update for initial state
		updatePhaseUI();

		// Clean up on unmount
		return () => {
			gameLoop.stop();
			gameLoop.offPhase(TurnPhase.PLAYER_ACTION, updatePhaseUI);
			gameLoop.offPhase(TurnPhase.ENVIRONMENT, updatePhaseUI);
			gameLoop.offPhase(TurnPhase.ENEMY, updatePhaseUI);
			gameLoop.offPhase(TurnPhase.ALLY, updatePhaseUI);
		};
	}, []);

	// Handle turn actions
	const handlePlayerAction = () => {
		if (gameLoopRef.current && currentPhase === TurnPhase.PLAYER_ACTION) {
			gameLoopRef.current.processPlayerAction();
		}
	};

	const handleNextTurn = () => {
		if (gameLoopRef.current) {
			gameLoopRef.current.advanceToNextTurn();
		}
	};

	return (
		<div style={{ width: '100vw', height: '100vh', backgroundColor: '#111' }}>
			{/* Movement tutorial */}
			<MovementTutorial />

			{/* Game info UI */}
			<div className="game-ui">
				<h3>Stargate Evolution</h3>
				<p>Turn: {turnNumber}</p>
				<p>Phase: {currentPhase}</p>

				<div className="game-controls">
					<p className="control-hint">WASD or Arrow Keys to move</p>
					<button
						onClick={() => setShowTradeScreen(!showTradeScreen)}
						style={{ marginTop: '10px' }}
					>
						{showTradeScreen ? 'Hide Trade' : 'Show Trade'}
					</button>
				</div>
			</div>

			{/* Trade UI */}
			{showTradeScreen && <div className="trade-screen-placeholder">Trade UI goes here</div>}

			{/* Turn controls */}
			<div className="turn-controls">
				{currentPhase === TurnPhase.PLAYER_ACTION && (
					<button onClick={handlePlayerAction}>End Action</button>
				)}
				<button onClick={handleNextTurn}>Skip to Next Turn</button>
			</div>

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

				{/* Stargate room environment */}
				<StargateRoom />

				{/* Character with keyboard controls */}
				<CharacterController ref={characterRef} speed={0.1} />

				{/* Camera that follows the character */}
				{characterRef.current && (
					<CameraController target={characterRef.current} offset={[0, 5, 5]} lerp={0.05} />
				)}

				{/* Coordinate helpers */}
				<axesHelper args={[5]} />
				<gridHelper args={[20, 20]} />
			</Canvas>
		</div>
	);
}
