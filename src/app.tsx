import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameStateManager, GameLoop, TurnPhase } from './systems';

// Basic mesh component for testing
function Box(props: any) {
	const meshRef = useRef<THREE.Mesh>(null!);

	// This effect is just for visuals, not game logic
	useFrame((state, delta) => {
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
			{/* Game info UI */}
			<div className="game-ui">
				<h3>Stargate Evolution</h3>
				<p>Turn: {turnNumber}</p>
				<p>Phase: {currentPhase}</p>
			</div>

			{/* Turn controls */}
			<div className="turn-controls">
				{currentPhase === TurnPhase.PLAYER_ACTION && (
					<button onClick={handlePlayerAction}>End Action</button>
				)}
				<button onClick={handleNextTurn}>Skip to Next Turn</button>
			</div>

			{/* Main 3D Canvas */}
			<Canvas>
				{/* Use orthographic camera for top-down view */}
				<OrthographicCamera makeDefault position={[0, 10, 0]} zoom={50} />

				{/* Lighting */}
				<ambientLight intensity={0.3} />
				<directionalLight position={[10, 10, 5]} intensity={1} />

				{/* Controls for panning and zooming */}
				<OrbitControls
					enableRotate={true}
					maxPolarAngle={Math.PI / 2.1}
					minPolarAngle={Math.PI / 3}
				/>

				{/* Planet representation - Earth */}
				<Planet position={[0, 0, 0]} color="#2060ff" />

				{/* Test Box - can be removed later */}
				<Box position={[2, 0, 0]} />

				{/* Coordinate helpers */}
				<axesHelper args={[5]} />
				<gridHelper args={[20, 20]} rotation={[Math.PI / 2, 0, 0]} />
			</Canvas>
		</div>
	);
}
