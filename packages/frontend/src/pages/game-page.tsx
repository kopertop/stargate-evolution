import { gameService } from '@stargate/db';
import * as PIXI from 'pixi.js';
import React, { useEffect, useRef, useState } from 'react';
import { GiReturnArrow } from 'react-icons/gi';
import { useNavigate, useParams } from 'react-router-dom';

import { validateOrRefreshSession } from '../auth/session';
import { DestinyStatusBar } from '../components/destiny-status-bar';
import { GalaxyMap } from '../components/galaxy-map';
import { GalaxyTravelModal } from '../components/galaxy-travel-modal';
import { NavButton } from '../components/nav-button';
import { ShipView } from '../components/ship-view';
import { Game } from '../game';
import { MapPopover } from '../map-popover';
import { Toast } from '../toast';
import type { DestinyStatus } from '../types';

type ViewMode = 'ship-view' | 'galaxy-map' | 'game-view';

interface Galaxy {
	id: string;
	name: string;
	position: { x: number; y: number };
	starSystems: any[];
}

// Helper function to parse destiny status JSON fields
function parseDestinyStatus(rawStatus: any): DestinyStatus {
	const parseJson = (str: string | undefined | null, fallback: any = {}) => {
		if (!str) return fallback;
		try {
			return JSON.parse(str);
		} catch {
			return fallback;
		}
	};

	return {
		id: rawStatus.id,
		gameId: rawStatus.gameId || rawStatus.game_id,
		name: rawStatus.name || 'Destiny',
		power: rawStatus.power || 0,
		maxPower: rawStatus.maxPower || rawStatus.max_power,
		shields: rawStatus.shields || 0,
		maxShields: rawStatus.maxShields || rawStatus.max_shields,
		hull: rawStatus.hull,
		maxHull: rawStatus.maxHull || rawStatus.max_hull,
		raceId: rawStatus.raceId || rawStatus.race_id,
		crew: parseJson(rawStatus.crew, []),
		location: parseJson(rawStatus.location, {}),
		stargateId: rawStatus.stargate || rawStatus.stargate_id,
		shield: parseJson(rawStatus.shield, { strength: 0, max: 500, coverage: 0 }),
		inventory: parseJson(rawStatus.inventory, {}),
		crewStatus: parseJson(rawStatus.crewStatus || rawStatus.crew_status, { onboard: 0, capacity: 100, manifest: [] }),
		atmosphere: parseJson(rawStatus.atmosphere, { co2: 0, o2: 21, co2Scrubbers: 0 }),
		weapons: parseJson(rawStatus.weapons, { mainGun: false, turrets: { total: 0, working: 0 } }),
		shuttles: parseJson(rawStatus.shuttles, { total: 0, working: 0, damaged: 0 }),
		notes: parseJson(rawStatus.notes, []),
		gameDays: rawStatus.gameDays || rawStatus.game_days || 1,
		gameHours: rawStatus.gameHours || rawStatus.game_hours || 0,
		ftlStatus: rawStatus.ftlStatus || rawStatus.ftl_status || 'ftl',
		nextFtlTransition: rawStatus.nextFtlTransition || rawStatus.next_ftl_transition || (6 + Math.random() * 42),
		createdAt: rawStatus.createdAt ? new Date(rawStatus.createdAt) : new Date(),
	};
}

// Calculate distance between two points
function calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
	return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
}

// Calculate travel cost based on distance
function calculateTravelCost(distance: number): number {
	return Math.ceil(distance / 10); // 1 power per 10 distance units
}

export const GamePage: React.FC = () => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<PIXI.Application | null>(null);
	const gameInstanceRef = useRef<Game | null>(null);
	const [destinyStatus, setDestinyStatus] = useState<DestinyStatus | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('ship-view');
	const [gameData, setGameData] = useState<any>(null);
	const [galaxies, setGalaxies] = useState<Galaxy[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentGalaxyId, setCurrentGalaxyId] = useState<string | null>(null);
	const [showTravelModal, setShowTravelModal] = useState(false);
	const [selectedGalaxy, setSelectedGalaxy] = useState<Galaxy | null>(null);
	const navigate = useNavigate();
	const params = useParams();

	// Calculate maximum travel range based on power (can be adjusted for game balance)
	const maxTravelRange = destinyStatus ? Math.floor(destinyStatus.power / 2) : 400;

	useEffect(() => {
		const initPIXI = async () => {
			if (!canvasRef.current) {
				console.log('No canvas found');
				return;
			}

			const app = new PIXI.Application();
			await app.init({
				width: 800,
				height: 600,
				background: 0x10101a,
			});

			canvasRef.current.appendChild(app.canvas);
			appRef.current = app;

			// Hide the canvas initially
			if (app.canvas) {
				app.canvas.style.display = 'none';
			}

			// Set loading to false so the menu can show
			setIsLoading(false);
		};

		initPIXI();

		// Cleanup function
		return () => {
			if (appRef.current) {
				appRef.current.destroy(true);
			}
		};
	}, [canvasRef.current]);

	const handleStartGame = async (gameId: string) => {
		console.log('Start game with ID:', gameId);
		try {
			// Show loading immediately when starting a game
			setViewMode('ship-view');
			setGalaxies([]); // Clear previous data

			// Use local database instead of backend API
			const loadedGameData = await gameService.getGameData(gameId);
			console.log('Loaded game data:', loadedGameData);
			console.log('Galaxies from DB:', loadedGameData.galaxies);
			console.log('Star systems from DB:', loadedGameData.star_systems);
			setGameData(loadedGameData);

			// Process galaxies data
			const galaxyData = loadedGameData.galaxies || [];
			console.log('Galaxy data to process:', galaxyData);

			const processedGalaxies = galaxyData.map((galaxy: any) => {
				console.log('Processing galaxy:', galaxy);
				return {
					id: galaxy.id,
					name: galaxy.name,
					position: { x: galaxy.x || 0, y: galaxy.y || 0 },
					starSystems: loadedGameData.star_systems?.filter((sys: any) => sys.galaxyId === galaxy.id) || [],
				};
			});

			console.log('Processed galaxies:', processedGalaxies);
			setGalaxies(processedGalaxies);

			// Parse destiny status
			const rawDestinyStatus = loadedGameData.destiny_status?.[0];
			console.log('Raw destiny status from DB:', rawDestinyStatus);
			if (rawDestinyStatus) {
				const rawTyped = rawDestinyStatus as any;
				const parsedDestinyStatus = parseDestinyStatus(rawDestinyStatus);
				console.log('Parsed destiny status:', parsedDestinyStatus);
				console.log('Power values - raw:', rawTyped.power, rawTyped.maxPower);
				console.log('Power values - parsed:', parsedDestinyStatus.power, parsedDestinyStatus.maxPower);

				// Initialize starting inventory if empty
				if (!parsedDestinyStatus.inventory || Object.keys(parsedDestinyStatus.inventory).length === 0) {
					parsedDestinyStatus.inventory = {
						food: 50,
						water: 100,
						parts: 10,
						medicine: 5,
						ancient_tech: 2,
					};
				}

				setDestinyStatus(parsedDestinyStatus);

				// Find current galaxy based on ship location
				if (parsedDestinyStatus.location?.systemId) {
					const systemId = parsedDestinyStatus.location.systemId;
					const currentSystem = loadedGameData.star_systems?.find((sys: any) => sys.id === systemId) as any;
					if (currentSystem && currentSystem.galaxyId) {
						setCurrentGalaxyId(currentSystem.galaxyId);
						console.log('Ship is currently in galaxy:', currentSystem.galaxyId);
					}
				}
			}

		} catch (err: any) {
			console.error('Failed to load game:', err);
			Toast.show('Failed to load game: ' + (err.message || err), 4000);
			navigate('/');
		}
	};

	const handleGalaxySelect = (galaxy: Galaxy) => {
		console.log('Selected galaxy:', galaxy);

		// If it's the current galaxy, go directly to game view
		if (galaxy.id === currentGalaxyId) {
			Toast.show(`Exploring ${galaxy.name}...`, 2000);
			switchToGameView(galaxy);
			return;
		}

		// Otherwise, show travel confirmation modal
		setSelectedGalaxy(galaxy);
		setShowTravelModal(true);
	};

	const handleConfirmTravel = () => {
		if (!selectedGalaxy || !destinyStatus) return;

		const currentGalaxy = galaxies.find(g => g.id === currentGalaxyId);
		if (!currentGalaxy) return;

		const distance = calculateDistance(currentGalaxy.position, selectedGalaxy.position);
		const travelCost = calculateTravelCost(distance);

		// Update power and current galaxy
		const updatedStatus = {
			...destinyStatus,
			power: destinyStatus.power - travelCost,
		};
		setDestinyStatus(updatedStatus);
		setCurrentGalaxyId(selectedGalaxy.id);

		Toast.show(`Traveled to ${selectedGalaxy.name}! Used ${travelCost} power.`, 3000);
		setShowTravelModal(false);
		setSelectedGalaxy(null);

		// Switch to game view
		switchToGameView(selectedGalaxy);
	};

	const switchToGameView = (galaxy: Galaxy) => {
		// Switch to game view
		setViewMode('game-view');

		// Show and initialize the PIXI canvas
		if (appRef.current?.canvas) {
			appRef.current.canvas.style.display = 'block';

			// Placeholder: Draw a simple rectangle representing the Destiny ship
			const ship = new PIXI.Graphics();
			ship.rect(-30, -10, 60, 20).fill(0xccccff);
			ship.x = appRef.current.screen.width / 2;
			ship.y = appRef.current.screen.height / 2;
			appRef.current.stage.addChild(ship);

			// Initialize the game loop and controls, pass gameData for future use
			gameInstanceRef.current = new Game(appRef.current, ship, gameData);

			window.addEventListener('keydown', (e) => {
				if ((e.key === 'm' || e.key === 'M') && gameInstanceRef.current) {
					MapPopover.toggle(gameData, ship, gameInstanceRef.current);
				}
			});
		}
	};

	const handleBackToShip = () => {
		setViewMode('ship-view');
		if (appRef.current?.canvas) {
			appRef.current.canvas.style.display = 'none';
		}
		// Clear the stage
		if (appRef.current?.stage) {
			appRef.current.stage.removeChildren();
		}
		if (gameInstanceRef.current) {
			gameInstanceRef.current = null;
		}
	};

	const handleBackToGalaxyMap = () => {
		setViewMode('galaxy-map');
		if (appRef.current?.canvas) {
			appRef.current.canvas.style.display = 'none';
		}
		// Clear the stage
		if (appRef.current?.stage) {
			appRef.current.stage.removeChildren();
		}
		if (gameInstanceRef.current) {
			gameInstanceRef.current = null;
		}
	};

	const handleBackToMenu = () => {
		setGameData(null);
		setGalaxies([]);
		setDestinyStatus(null);
		setCurrentGalaxyId(null);
		if (appRef.current?.canvas) {
			appRef.current.canvas.style.display = 'none';
		}
		// Clear the stage
		if (appRef.current?.stage) {
			appRef.current.stage.removeChildren();
		}
		if (gameInstanceRef.current) {
			gameInstanceRef.current = null;
		}
		navigate('/');
	};

	const handleNavigateToGalaxyMap = () => {
		setViewMode('galaxy-map');
	};

	// Handler for updating destiny status from ship view
	const handleDestinyStatusUpdate = (newStatus: DestinyStatus) => {
		setDestinyStatus(newStatus);
	};

	useEffect(() => {
		if (params.gameId) {
			handleStartGame(params.gameId);
		}
	}, [params.gameId]);

	// Debug function for console access
	useEffect(() => {
		(window as any).debugShipStats = () => {
			console.group('🚀 Destiny Ship Debug Info');

			if (!destinyStatus) {
				console.warn('No destiny status available');
				console.groupEnd();
				return;
			}

			console.log('Raw Destiny Status:', destinyStatus);

			console.group('⚡ Power & Systems');
			console.log(`Power: ${destinyStatus.power}/${destinyStatus.maxPower}`);
			console.log(`Hull: ${destinyStatus.hull}/${destinyStatus.maxHull}`);
			console.log(`Shields: ${destinyStatus.shields}/${destinyStatus.maxShields}`);
			console.groupEnd();

			console.group('🛡️ Shield Details');
			console.log('Shield Object:', destinyStatus.shield);
			console.log(`Strength: ${destinyStatus.shield?.strength}/${destinyStatus.shield?.max}`);
			console.log(`Coverage: ${destinyStatus.shield?.coverage}%`);
			console.groupEnd();

			console.group('👨‍🚀 Crew & Life Support');
			console.log('Crew Status:', destinyStatus.crewStatus);
			console.log('Atmosphere:', destinyStatus.atmosphere);
			console.groupEnd();

			console.group('📍 Location & Navigation');
			console.log('Raw Location:', destinyStatus.location);
			console.log(`Current Galaxy ID: ${currentGalaxyId}`);
			console.log(`Max Travel Range: ${maxTravelRange} light-years`);

			if (currentGalaxyId) {
				const currentGalaxy = galaxies.find(g => g.id === currentGalaxyId);
				console.log('Current Galaxy:', currentGalaxy);
			}
			console.groupEnd();

			console.group('🔫 Weapons & Equipment');
			console.log('Weapons:', destinyStatus.weapons);
			console.log('Shuttles:', destinyStatus.shuttles);
			console.log('Inventory:', destinyStatus.inventory);
			console.groupEnd();

			console.group('🏠 Ship Status');
			console.log('Notes:', destinyStatus.notes);
			console.groupEnd();

			console.group('🌌 Galaxy Data');
			console.log(`Total Galaxies: ${galaxies.length}`);
			console.log('All Galaxies:', galaxies);
			console.log('Raw Game Data:', gameData);
			console.groupEnd();

			console.groupEnd();

			return {
				destinyStatus,
				currentGalaxyId,
				maxTravelRange,
				galaxies,
				gameData,
				powerPercentage: Math.round((destinyStatus.power / destinyStatus.maxPower) * 100),
				hullPercentage: Math.round((destinyStatus.hull / destinyStatus.maxHull) * 100),
				shieldPercentage: Math.round((destinyStatus.shields / destinyStatus.maxShields) * 100),
			};
		};

		// Also expose individual components for easier access
		(window as any).debugGameState = {
			destinyStatus,
			currentGalaxyId,
			maxTravelRange,
			galaxies,
			gameData,
			viewMode,
		};

		console.log('🔧 Debug functions available:');
		console.log('  debugShipStats() - Display detailed ship information');
		console.log('  debugGameState - Access to raw game state object');

		// Cleanup function
		return () => {
			delete (window as any).debugShipStats;
			delete (window as any).debugGameState;
		};
	}, [destinyStatus, currentGalaxyId, maxTravelRange, galaxies, gameData, viewMode]);

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

			{isLoading && (
				<div className="text-white" style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
				}}>
					<h3>Loading Stargate Evolution...</h3>
				</div>
			)}

			{/* Ship View */}
			{!isLoading && viewMode === 'ship-view' && destinyStatus && (
				<div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'auto' }}>
					<NavButton onClick={handleBackToMenu}>
						<GiReturnArrow size={20} /> Back to Menu
					</NavButton>
					<div style={{ padding: '20px', paddingTop: '60px' }}>
						<ShipView
							destinyStatus={destinyStatus}
							onStatusUpdate={handleDestinyStatusUpdate}
							onNavigateToGalaxy={handleNavigateToGalaxyMap}
							gameId={params.gameId}
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
