import React, { useEffect, useRef, useState } from 'react';
import { gameService } from '@stargate/db';
import * as PIXI from 'pixi.js';
import type { DestinyStatus } from '@stargate/common/types/destiny';

import { validateOrRefreshSession } from '../auth/session';
import { DestinyStatusBar } from '../components/destiny-status-bar';
import { GalaxyMap } from '../components/galaxy-map';
import { Game } from '../game';
import { MapPopover } from '../map-popover';
import { Toast } from '../toast';
import { useNavigate, useParams } from 'react-router-dom';
import { NavButton } from '../components/nav-button';

type ViewMode = 'galaxy-map' | 'game-view';

interface Galaxy {
	id: string;
	name: string;
	position: { x: number; y: number };
	starSystems: any[];
}

// Helper function to parse destiny status JSON fields
function parseDestinyStatus(rawStatus: any): DestinyStatus {
	const parseJson = (str: string | undefined | null, fallback: any = {}) => {
		if (!str || typeof str !== 'string') return fallback;
		try {
			return JSON.parse(str);
		} catch {
			return fallback;
		}
	};

	return {
		...rawStatus,
		shield: parseJson(rawStatus.shield, { strength: 0, max: 500, coverage: 0 }),
		inventory: parseJson(rawStatus.inventory, {}),
		crewStatus: parseJson(rawStatus.crewStatus, { onboard: 0, capacity: 100, manifest: [] }),
		atmosphere: parseJson(rawStatus.atmosphere, { co2: 0, o2: 21, co2Scrubbers: 0, o2Scrubbers: 0 }),
		weapons: parseJson(rawStatus.weapons, { mainGun: false, turrets: { total: 0, working: 0 } }),
		shuttles: parseJson(rawStatus.shuttles, { total: 0, working: 0, damaged: 0 }),
		rooms: parseJson(rawStatus.rooms, []),
		notes: parseJson(rawStatus.notes, []),
	};
}

export const GamePage: React.FC = () => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<PIXI.Application | null>(null);
	const gameInstanceRef = useRef<Game | null>(null);
	const [destinyStatus, setDestinyStatus] = useState<DestinyStatus | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('galaxy-map');
	const [gameData, setGameData] = useState<any>(null);
	const [galaxies, setGalaxies] = useState<Galaxy[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();
	const params = useParams();

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

			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

			// Session persistence: check for existing session and validate/refresh
			const session = await validateOrRefreshSession(API_URL);
			if (session && session.user) {
				Toast.show(`Welcome back, ${session.user.name || session.user.email}!`, 3500);
			}

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
			setViewMode('galaxy-map');
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
			if (rawDestinyStatus) {
				const parsedDestinyStatus = parseDestinyStatus(rawDestinyStatus);
				console.log('Parsed destiny status:', parsedDestinyStatus);
				setDestinyStatus(parsedDestinyStatus);
			}

		} catch (err: any) {
			console.error('Failed to load game:', err);
			Toast.show('Failed to load game: ' + (err.message || err), 4000);
			navigate('/');
		}
	};

	const handleGalaxySelect = (galaxy: Galaxy) => {
		console.log('Selected galaxy:', galaxy);
		Toast.show(`Exploring ${galaxy.name}...`, 2000);

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

	useEffect(() => {
		if (params.gameId) {
			handleStartGame(params.gameId);
		}
	}, [params.gameId]);

	return (
		<div style={{
			background: '#000',
			minHeight: '100vh',
			...(viewMode === 'galaxy-map' ? {} : {
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			})
		}}>
			<div ref={canvasRef} />

			{isLoading && (
				<div className="text-white" style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)'
				}}>
					<h3>Loading Stargate Evolution...</h3>
				</div>
			)}

			{!isLoading && viewMode === 'galaxy-map' && galaxies.length > 0 && (
				<div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
					<NavButton onClick={handleBackToMenu}>
						← Back to Menu
					</NavButton>
					<GalaxyMap
						galaxies={galaxies}
						onGalaxySelect={handleGalaxySelect}
					/>
				</div>
			)}

			{!isLoading && viewMode === 'galaxy-map' && galaxies.length === 0 && (
				<div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
					<NavButton onClick={handleBackToMenu}>
						← Back to Menu
					</NavButton>
					<div className="text-white text-center" style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)'
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
					← Back to Galaxy Map
				</NavButton>
			)}

			{destinyStatus && viewMode === 'game-view' && (
				<DestinyStatusBar status={destinyStatus} />
			)}

		</div>
	);
};
