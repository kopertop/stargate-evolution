import React, { useEffect, useRef, useState } from 'react';
import { gameService } from '@stargate/db';
import * as PIXI from 'pixi.js';
import type { DestinyStatus } from '@stargate/common/types/destiny';

import { validateOrRefreshSession } from '../auth/session';
import { DestinyStatusBar } from '../components/destiny-status-bar';
import { Game } from '../game';
import { GameMenu } from '../game-menu';
import { MapPopover } from '../map-popover';
import { Toast } from '../toast';

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

export function GamePage() {
	const canvasRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<PIXI.Application | null>(null);
	const gameInstanceRef = useRef<Game | null>(null);
	const [destinyStatus, setDestinyStatus] = useState<DestinyStatus | null>(null);

	useEffect(() => {
		const initGame = async () => {
			if (!canvasRef.current) return;

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
				// Hide Google Sign-In button if present
				setTimeout(() => {
					const btn = document.getElementById('google-signin-btn');
					if (btn) btn.style.display = 'none';
				}, 0);
			}

			// Show the game menu overlay and only start the game when a game is selected
			GameMenu.show(async (gameId: string) => {
				console.log('Start game with ID:', gameId);
				GameMenu.hide();
				try {
					// Use local database instead of backend API
					const gameData = await gameService.getGameData(gameId);
					console.log('Loaded game data:', gameData);
					const rawDestinyStatus = gameData.destiny_status?.[0];
					if (rawDestinyStatus) {
						const parsedDestinyStatus = parseDestinyStatus(rawDestinyStatus);
						console.log('Parsed destiny status:', parsedDestinyStatus);
						setDestinyStatus(parsedDestinyStatus);
					}

					// Placeholder: Draw a simple rectangle representing the Destiny ship
					const ship = new PIXI.Graphics();
					ship.rect(-30, -10, 60, 20).fill(0xccccff);
					ship.x = app.screen.width / 2;
					ship.y = app.screen.height / 2;
					app.stage.addChild(ship);

					// Initialize the game loop and controls, pass gameData for future use
					gameInstanceRef.current = new Game(app, ship, gameData);

					window.addEventListener('keydown', (e) => {
						if ((e.key === 'm' || e.key === 'M') && gameInstanceRef.current) {
							MapPopover.toggle(gameData, ship, gameInstanceRef.current);
						}
					});
				} catch (err: any) {
					Toast.show('Failed to load game: ' + (err.message || err), 4000);
				}
			});
		};

		initGame();

		// Cleanup function
		return () => {
			if (appRef.current) {
				appRef.current.destroy(true);
			}
		};
	}, []);

	return (
		<div style={{
			background: '#000',
			minHeight: '100vh',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
		}}>
			<div ref={canvasRef} />
			{destinyStatus && <DestinyStatusBar status={destinyStatus} />}
		</div>
	);
}
