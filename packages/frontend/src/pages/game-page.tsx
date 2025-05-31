import { useQuery } from '@livestore/react';
import type { DestinyStatus } from '@stargate/common/models/destiny-status';
import * as PIXI from 'pixi.js';
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { GiReturnArrow } from 'react-icons/gi';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { DestinyStatusBar } from '../components/destiny-status-bar';
import { GalaxyMap } from '../components/galaxy-map';
import { GalaxyTravelModal } from '../components/galaxy-travel-modal';
import { NavButton } from '../components/nav-button';
import { ShipView } from '../components/ship-view';
import { DestinyStatusProvider, useDestinyStatus } from '../contexts/destiny-status-context';
import { GameStateProvider, useGameState } from '../contexts/game-state-context';
import { Game } from '../game';
import { useGameService } from '../services/use-game-service';

type ViewMode = 'ship-view' | 'galaxy-map' | 'game-view';

interface Galaxy {
	id: string;
	name: string;
	position: { x: number; y: number };
	starSystems: any[];
}

// Calculate distance between two points
function calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
	return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
}

// Calculate travel cost based on distance
function calculateTravelCost(distance: number): number {
	return Math.ceil(distance / 10); // 1 power per 10 distance units
}

// Inner component that uses the context providers
const GamePageInner: React.FC = () => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<PIXI.Application | null>(null);
	const gameInstanceRef = useRef<Game | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('ship-view');
	const [galaxies, setGalaxies] = useState<Galaxy[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentGalaxyId, setCurrentGalaxyId] = useState<string | null>(null);
	const [showTravelModal, setShowTravelModal] = useState(false);
	const [selectedGalaxy, setSelectedGalaxy] = useState<Galaxy | null>(null);
	const navigate = useNavigate();
	const params = useParams();

	// Use the context providers for data
	const { game } = useGameState();
	const { destinyStatus, updateDestinyStatus } = useDestinyStatus();
	const gameService = useGameService();
	const game_id = params.game_id;

	// Query galaxy and star system data
	const galaxiesQuery = useQuery(game_id ? gameService.queries.galaxiesByGame(game_id) : gameService.queries.galaxiesByGame(''));
	const starSystemsQuery = useQuery(game_id ? gameService.queries.starSystemsByGame(game_id) : gameService.queries.starSystemsByGame(''));

	const rawGalaxies = galaxiesQuery || [];
	const rawStarSystems = starSystemsQuery || [];

	// Calculate maximum travel range based on power (can be adjusted for game balance)
	const maxTravelRange = destinyStatus ? Math.floor(destinyStatus.power / 2) : 400;

	useEffect(() => {
		const initPIXI = async () => {
			if (!canvasRef.current) {
				console.log('No canvas found');
				return;
			}

			try {
				const app = new PIXI.Application();
				await app.init({
					width: 800,
					height: 600,
					background: 0x10101a,
				});

				// Check if canvasRef is still valid after async operation
				if (!canvasRef.current) {
					app.destroy(true);
					return;
				}

				canvasRef.current.appendChild(app.canvas);
				appRef.current = app;

				// Hide the canvas initially
				if (app.canvas) {
					app.canvas.style.display = 'none';
				}

				// Set loading to false when both PIXI and data are ready
				if (game && destinyStatus) {
					setIsLoading(false);
				}
			} catch (error) {
				console.error('Failed to initialize PIXI:', error);
				setIsLoading(false);
			}
		};

		initPIXI();

		// Cleanup function
		return () => {
			if (appRef.current) {
				try {
					// Safer destroy call - check if destroy method exists and handle errors
					if (typeof appRef.current.destroy === 'function') {
						appRef.current.destroy(true);
					}
				} catch (error) {
					console.warn('Error during PIXI cleanup:', error);
				}
				appRef.current = null;
			}
		};
	}, []);

	// Update loading state when data becomes available
	useEffect(() => {
		if (game && destinyStatus && appRef.current) {
			setIsLoading(false);
		}
	}, [!!game, !!destinyStatus, !!appRef.current]);

	// Process galaxy and star system data
	useEffect(() => {
		if (rawGalaxies.length > 0) {
			const processedGalaxies = rawGalaxies.map((galaxy: any) => {
				// Find star systems for this galaxy
				const galaxyStarSystems = rawStarSystems.filter((sys: any) => sys.galaxyId === galaxy.id);

				return {
					id: galaxy.id,
					name: galaxy.name,
					position: { x: galaxy.x || 0, y: galaxy.y || 0 },
					starSystems: galaxyStarSystems,
				};
			});

			console.log('Processed galaxies:', processedGalaxies);
			setGalaxies(processedGalaxies);
		}
	}, [rawGalaxies, rawStarSystems]);

	const handleGalaxySelect = (galaxy: Galaxy) => {
		console.log('Selected galaxy:', galaxy);
		setSelectedGalaxy(galaxy);
		setShowTravelModal(true);
	};

	const handleConfirmTravel = async () => {
		if (!selectedGalaxy || !destinyStatus || !game_id) return;

		const currentGalaxy = galaxies.find(g => g.id === currentGalaxyId);
		const distance = currentGalaxy ?
			calculateDistance(currentGalaxy.position, selectedGalaxy.position) : 0;
		const cost = calculateTravelCost(distance);

		if (destinyStatus.power >= cost) {
			// Update destiny status using the context
			await updateDestinyStatus({
				power: destinyStatus.power - cost,
			});

			setCurrentGalaxyId(selectedGalaxy.id);
			setShowTravelModal(false);
			setSelectedGalaxy(null);
			switchToGameView(selectedGalaxy);

			toast.success(`Traveled to ${selectedGalaxy.name}! Used ${cost} power.`, {
				position: 'top-center',
				autoClose: 3000,
			});
		} else {
			toast.error(`Not enough power! Need ${cost} power, have ${destinyStatus.power}.`, {
				position: 'top-center',
				autoClose: 4000,
			});
		}
	};

	const switchToGameView = (galaxy: Galaxy) => {
		console.log('Switching to game view for galaxy:', galaxy);
		setViewMode('game-view');

		if (appRef.current && canvasRef.current) {
			try {
				const canvas = appRef.current.canvas;
				if (canvas) {
					canvas.style.display = 'block';
				}

				// Create a simple ship graphic for the Game instance
				const ship = new PIXI.Graphics();
				ship.rect(-30, -10, 60, 20).fill(0xccccff);
				ship.x = appRef.current.screen.width / 2;
				ship.y = appRef.current.screen.height / 2;

				// Initialize or update the game instance
				if (!gameInstanceRef.current) {
					gameInstanceRef.current = new Game(appRef.current, ship, {});
					appRef.current.stage.addChild(ship);
				}
			} catch (error) {
				console.error('Error switching to game view:', error);
			}
		}
	};

	const handleBackToShip = () => {
		setViewMode('ship-view');
		if (appRef.current && appRef.current.canvas) {
			appRef.current.canvas.style.display = 'none';
		}
	};

	const handleBackToGalaxyMap = () => {
		setViewMode('galaxy-map');
		if (appRef.current && appRef.current.canvas) {
			appRef.current.canvas.style.display = 'none';
		}
	};

	const handleBackToMenu = () => {
		navigate('/');
	};

	const handleNavigateToGalaxyMap = () => {
		setViewMode('galaxy-map');
	};

	const handleDestinyStatusUpdate = async (newStatus: DestinyStatus) => {
		await updateDestinyStatus(newStatus);
	};

	const currentGalaxy = galaxies.find(g => g.id === currentGalaxyId) || null;
	const travelDistance = selectedGalaxy && currentGalaxy ?
		calculateDistance(currentGalaxy.position, selectedGalaxy.position) : 0;
	const travelCost = calculateTravelCost(travelDistance);

	return (
		<div style={{
			background: '#000',
			minHeight: '100vh',
			...(viewMode === 'galaxy-map' ? {} : viewMode === 'ship-view' ? {} : {
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			}),
		}}>
			<div ref={canvasRef} />

			{(isLoading) && (
				<div className="text-white" style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					textAlign: 'center',
				}}>
					<h3>Loading Stargate Evolution...</h3>
					<Spinner animation="border" role="status"/>
				</div>
			)}

			{/* Ship View */}
			{!isLoading && viewMode === 'ship-view' && destinyStatus && (
				<div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
					<NavButton onClick={handleBackToMenu}>
						<GiReturnArrow size={20} /> Back to Menu
					</NavButton>
					<div style={{
						position: 'absolute',
						top: '60px', // Space for nav button
						left: 0,
						right: 0,
						bottom: '72px', // Space for destiny status bar (approximately 72px height)
						overflow: 'hidden',
					}}>
						<ShipView
							destinyStatus={destinyStatus}
							onStatusUpdate={handleDestinyStatusUpdate}
							onNavigateToGalaxy={handleNavigateToGalaxyMap}
							game_id={params.game_id}
						/>
					</div>
				</div>
			)}

			{/* Galaxy Map View */}
			{!isLoading && viewMode === 'galaxy-map' && galaxies.length > 0 && (
				<div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
					<NavButton onClick={handleBackToShip}>
						<GiReturnArrow size={20} /> Back to Ship
					</NavButton>
					<GalaxyMap
						galaxies={galaxies}
						onGalaxySelect={handleGalaxySelect}
						currentGalaxyId={currentGalaxyId || undefined}
						shipPower={destinyStatus?.power || 0}
						maxTravelRange={maxTravelRange}
					/>
				</div>
			)}

			{!isLoading && viewMode === 'galaxy-map' && galaxies.length === 0 && (
				<div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
					<NavButton onClick={handleBackToShip}>
						<GiReturnArrow size={20} /> Back to Ship
					</NavButton>
					<div className="text-white text-center" style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
					}}>
						<div className="spinner-border text-primary mb-3" role="status">
							<span className="visually-hidden">Loading...</span>
						</div>
						<h4>Loading Game Data...</h4>
						<p>Preparing galaxy map...</p>
					</div>
				</div>
			)}

			{viewMode === 'game-view' && (
				<NavButton onClick={handleBackToGalaxyMap}>
					<GiReturnArrow size={20} /> Back to Galaxy Map
				</NavButton>
			)}

			{/* Travel Modal */}
			<GalaxyTravelModal
				show={showTravelModal}
				onHide={() => {
					setShowTravelModal(false);
					setSelectedGalaxy(null);
				}}
				onConfirm={handleConfirmTravel}
				sourceGalaxy={currentGalaxy}
				targetGalaxy={selectedGalaxy}
				travelCost={travelCost}
				currentPower={destinyStatus?.power || 0}
				distance={travelDistance}
			/>

			{destinyStatus && (
				<DestinyStatusBar status={destinyStatus} />
			)}
		</div>
	);
};

// Main component that provides the context
export const GamePage: React.FC = () => {
	const params = useParams();

	return (
		<GameStateProvider game_id={params.game_id}>
			<DestinyStatusProvider>
				<GamePageInner />
			</DestinyStatusProvider>
		</GameStateProvider>
	);
};
