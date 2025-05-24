import React, { useEffect, useRef } from 'react';
import { gameService } from '@stargate/db';
import * as PIXI from 'pixi.js';

import { validateOrRefreshSession } from '../auth/session';
import { DestinyStatusBar } from '../destiny-status-bar';
import { Game } from '../game';
import { GameMenu } from '../game-menu';
import { MapPopover } from '../map-popover';
import { Toast } from '../toast';

export function GamePage() {
	const canvasRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<PIXI.Application | null>(null);
	const gameInstanceRef = useRef<Game | null>(null);

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
					const destinyStatus = gameData.destiny_status?.[0];
					if (destinyStatus) {
						DestinyStatusBar.show(destinyStatus as any);
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
		</div>
	);
}
