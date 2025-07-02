import { Ticker } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { InputDevice } from 'pixijs-input-devices';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Container, Modal, Form, Row, Col, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router';

import { GAMEPAD_BUTTONS } from '../constants/gamepad';
import { Game } from '../game';
import { useGameController } from '../services/game-controller';

type Direction = 'up' | 'down' | 'left' | 'right';
type MenuAction = 'pause' | 'back' | 'activate';
type Keybindings = Record<Direction, string[]>;
type GamepadBindings = Record<Direction, number[]> & Record<MenuAction, number[]>;

const DEFAULT_KEYBINDINGS: Keybindings = {
	up: ['w', 'ArrowUp'],
	down: ['s', 'ArrowDown'],
	left: ['a', 'ArrowLeft'],
	right: ['d', 'ArrowRight'],
};

const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
	up: [GAMEPAD_BUTTONS.DPAD_UP], // D-pad up
	down: [GAMEPAD_BUTTONS.DPAD_DOWN], // D-pad down
	left: [GAMEPAD_BUTTONS.DPAD_LEFT], // D-pad left
	right: [GAMEPAD_BUTTONS.DPAD_RIGHT], // D-pad right
	pause: [GAMEPAD_BUTTONS.START, GAMEPAD_BUTTONS.BACK], // Start (+) and Select (-) buttons
	back: [GAMEPAD_BUTTONS.B], // B button
	activate: [GAMEPAD_BUTTONS.A], // A button
};

export const GamePage: React.FC = () => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const pixiAppRef = useRef<PIXI.Application | null>(null);
	const gameRef = useRef<Game | null>(null);
	const navigate = useNavigate();
	const [showPause, setShowPause] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showDebug, setShowDebug] = useState(false);
	const [speed, setSpeed] = useState(4);
	const [keybindings, setKeybindings] = useState<Keybindings>(DEFAULT_KEYBINDINGS);
	const [gamepadBindings, setGamepadBindings] = useState<GamepadBindings>(DEFAULT_GAMEPAD_BINDINGS);
	const [listeningKey, setListeningKey] = useState<{ action: string; index: number } | null>(null);
	const [focusedMenuItem, setFocusedMenuItem] = useState(0); // Track focused menu item
	const [gamepadDebugState, setGamepadDebugState] = useState<any[]>([]); // Debug state for gamepad info
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Use the centralized game controller service
	const controller = useGameController();

	// Fullscreen detection
	useEffect(() => {
		const handleFullscreenChange = () => {
			const isCurrentlyFullscreen = !!(
				document.fullscreenElement ||
				(document as any).webkitFullscreenElement ||
				(document as any).mozFullScreenElement ||
				(document as any).msFullscreenElement
			);
			setIsFullscreen(isCurrentlyFullscreen);
			console.log('[FULLSCREEN] Fullscreen state changed:', isCurrentlyFullscreen);
		};

		// Listen for fullscreen changes
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mozfullscreenchange', handleFullscreenChange);
		document.addEventListener('MSFullscreenChange', handleFullscreenChange);

		// Check initial state
		handleFullscreenChange();

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
			document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
		};
	}, []);

	// PixiJS setup
	useEffect(() => {
		let app: PIXI.Application;
		let destroyed = false;

		(async () => {
			app = new PIXI.Application();
			await app.init({
				width: window.innerWidth,
				height: window.innerHeight,
				background: 0x10101a,
				antialias: true,
				resolution: window.devicePixelRatio || 1,
			});
			if (destroyed) {
				app.destroy(true);
				return;
			}
			pixiAppRef.current = app;
			if (canvasRef.current) {
				canvasRef.current.innerHTML = '';
				canvasRef.current.appendChild(app.canvas);
			}
			const game = new Game(app, {
				speed,
				keybindings,
				gamepadBindings,
				// Pass controller methods to Game class
				onButtonPress: controller.onButtonPress,
				onButtonRelease: controller.onButtonRelease,
				onAxisChange: controller.onAxisChange,
				getAxisValue: controller.getAxisValue,
				isPressed: controller.isPressed,
			});
			gameRef.current = game;
		})();

		return () => {
			destroyed = true;
			if (pixiAppRef.current) {
				pixiAppRef.current.destroy(true);
				pixiAppRef.current = null;
			}
		};

	}, [speed, keybindings, gamepadBindings]);

	// Game controller event subscriptions
	useEffect(() => {
		if (!controller.isConnected) return;

		console.log('[GAME-PAGE-CONTROLLER] Setting up controller event subscriptions');

		// Pause button handling (START or BACK buttons)
		const unsubscribePauseStart = controller.onButtonRelease('START', () => {
			console.log('[GAME-PAGE-CONTROLLER] START button released - toggling pause');
			setShowPause(prev => {
				console.log('[GAME-PAGE-CONTROLLER] Pause toggled from', prev, 'to', !prev);
				return !prev;
			});
			setFocusedMenuItem(0);
		});

		const unsubscribePauseBack = controller.onButtonRelease('BACK', () => {
			console.log('[GAME-PAGE-CONTROLLER] BACK button released - toggling pause');
			setShowPause(prev => {
				console.log('[GAME-PAGE-CONTROLLER] Pause toggled from', prev, 'to', !prev);
				return !prev;
			});
			setFocusedMenuItem(0);
		});

		// Menu navigation (only when menus are open)
		const unsubscribeUpNav = controller.onButtonRelease('DPAD_UP', () => {
			if (showPause || showSettings || showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad UP released - menu navigation');
				const menuItemCount = showPause ? 5 : 1;
				setFocusedMenuItem(prev => (prev > 0 ? prev - 1 : menuItemCount - 1));
			}
		});

		const unsubscribeDownNav = controller.onButtonRelease('DPAD_DOWN', () => {
			if (showPause || showSettings || showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad DOWN released - menu navigation');
				const menuItemCount = showPause ? 5 : 1;
				setFocusedMenuItem(prev => (prev < menuItemCount - 1 ? prev + 1 : 0));
			}
		});

		// Menu back button (B button)
		const unsubscribeMenuBack = controller.onButtonRelease('B', () => {
			if (showPause || showSettings || showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] B button released - closing menus');
				setShowPause(false);
				setShowSettings(false);
				setShowDebug(false);
			}
		});

		// Menu activate button (A button)
		const unsubscribeMenuActivate = controller.onButtonRelease('A', () => {
			if (showPause) {
				console.log('[GAME-PAGE-CONTROLLER] A button released - activating menu item:', focusedMenuItem);
				switch (focusedMenuItem) {
				case 0: // Resume
					console.log('[GAME-PAGE-CONTROLLER] Resuming game');
					setShowPause(false);
					break;
				case 1: // Main Menu
					console.log('[GAME-PAGE-CONTROLLER] Navigating to main menu');
					navigate('/');
					break;
				case 2: // Save Game (disabled)
					console.log('[GAME-PAGE-CONTROLLER] Save game button is disabled');
					break;
				case 3: // Settings
					console.log('[GAME-PAGE-CONTROLLER] Opening settings menu');
					setShowSettings(true);
					setShowPause(false);
					setFocusedMenuItem(0);
					break;
				case 4: // Debug
					console.log('[GAME-PAGE-CONTROLLER] Opening debug menu');
					setShowDebug(true);
					setShowPause(false);
					setFocusedMenuItem(0);
					break;
				}
			} else if (showSettings) {
				console.log('[GAME-PAGE-CONTROLLER] Closing settings menu');
				setShowSettings(false);
			} else if (showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] Closing debug menu');
				setShowDebug(false);
			}
		});

		// Cleanup subscriptions
		return () => {
			console.log('[GAME-PAGE-CONTROLLER] Cleaning up controller subscriptions');
			unsubscribePauseStart();
			unsubscribePauseBack();
			unsubscribeUpNav();
			unsubscribeDownNav();
			unsubscribeMenuBack();
			unsubscribeMenuActivate();
		};
	}, [controller, showPause, showSettings, showDebug, focusedMenuItem, navigate]);

	// Update game menu state when any menu opens/closes
	useEffect(() => {
		if (gameRef.current) {
			const menuOpen = showPause || showSettings || showDebug;
			gameRef.current.setMenuOpen(menuOpen);
			console.log('[GAME-PAGE-CONTROLLER] Game menu state updated:', {
				menuOpen,
				showPause,
				showSettings,
				showDebug,
				timestamp: new Date().toISOString(),
			});
		}
	}, [showPause, showSettings, showDebug]);

	// Keyboard controls
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setShowPause((prev) => !prev);
			}
			if (listeningKey) {
				setKeybindings((prev) => {
					const updated: Keybindings = { ...prev };
					const arr = [...updated[listeningKey.action as Direction]];
					arr[listeningKey.index] = e.key;
					updated[listeningKey.action as Direction] = arr;
					return updated;
				});
				setListeningKey(null);
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [listeningKey]);

	return (
		<Container
			fluid
			style={{
				padding: 0,
				background: '#000',
				minHeight: '100vh',
				position: 'relative',
				cursor: isFullscreen ? 'none' : 'default'
			}}
		>
			{!isFullscreen && (
				<div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
					<Button variant="secondary" onClick={() => navigate('/')}>Back to Menu</Button>
				</div>
			)}
			<div
				ref={canvasRef}
				style={{
					width: '100vw',
					height: '100vh',
					overflow: 'hidden',
					position: 'relative',
					zIndex: 1,
					cursor: isFullscreen ? 'none' : 'default'
				}}
			/>

			{/* Pause Modal */}
			<Modal show={showPause} centered backdrop="static" keyboard={false}>
				<Modal.Header>
					<Modal.Title>Paused</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className="d-grid gap-2">
						<Button
							variant={focusedMenuItem === 0 ? 'primary' : 'outline-primary'}
							size="lg"
							onClick={() => setShowPause(false)}
							style={focusedMenuItem === 0 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
						Resume
						</Button>
						<Button
							variant={focusedMenuItem === 1 ? 'primary' : 'secondary'}
							size="lg"
							onClick={() => navigate('/')}
							style={focusedMenuItem === 1 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
						Main Menu
						</Button>
						<Button
							variant={focusedMenuItem === 2 ? 'primary' : 'outline-secondary'}
							size="lg"
							disabled
							title="TODO: Save game coming soon"
							style={focusedMenuItem === 2 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
						Save Game (TODO)
						</Button>
						<Button
							variant={focusedMenuItem === 3 ? 'primary' : 'outline-secondary'}
							size="lg"
							onClick={() => { setShowSettings(true); setShowPause(false); setFocusedMenuItem(0); }}
							style={focusedMenuItem === 3 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
						Settings
						</Button>
						<Button
							variant={focusedMenuItem === 4 ? 'primary' : 'outline-secondary'}
							size="lg"
							onClick={() => { setShowDebug(true); setShowPause(false); setFocusedMenuItem(0); }}
							style={focusedMenuItem === 4 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
						Debug
						</Button>
					</div>
				</Modal.Body>
			</Modal>

			{/* Settings Modal */}
			<Modal show={showSettings} centered onHide={() => setShowSettings(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Settings</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<Form.Group as={Row} className="mb-3" controlId="speed">
							<Form.Label column sm={4}>Speed</Form.Label>
							<Col sm={8}>
								<Form.Range min={1} max={10} value={speed} onChange={e => setSpeed(Number(e.target.value))} />
								<span>{speed}</span>
							</Col>
						</Form.Group>
						<hr />
						<h5>Keybindings</h5>
						<Table size="sm" bordered>
							<thead>
								<tr><th>Action</th><th>Primary</th><th>Secondary</th></tr>
							</thead>
							<tbody>
								{Object.entries(keybindings).map(([action, keys]) => (
									<tr key={action}>
										<td>{action.charAt(0).toUpperCase() + action.slice(1)}</td>
										<td>
											<Button variant={listeningKey?.action === action && listeningKey?.index === 0 ? 'warning' : 'outline-primary'} size="sm" onClick={() => setListeningKey({ action, index: 0 })}>
												{listeningKey?.action === action && listeningKey?.index === 0 ? 'Press key...' : keys[0]}
											</Button>
										</td>
										<td>
											<Button variant={listeningKey?.action === action && listeningKey?.index === 1 ? 'warning' : 'outline-primary'} size="sm" onClick={() => setListeningKey({ action, index: 1 })}>
												{listeningKey?.action === action && listeningKey?.index === 1 ? 'Press key...' : keys[1]}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</Table>
						<hr />
						<h5>Gamepad Bindings</h5>
						<Table size="sm" bordered>
							<thead>
								<tr><th>Action</th><th>Button Index</th></tr>
							</thead>
							<tbody>
								{Object.entries(gamepadBindings).map(([action, btns]) => (
									<tr key={action}>
										<td>{action.charAt(0).toUpperCase() + action.slice(1)}</td>
										<td>{btns.join(', ')}</td>
									</tr>
								))}
							</tbody>
						</Table>
						<div className="text-muted">(Gamepad rebinding coming soon)</div>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowSettings(false)}>Close</Button>
				</Modal.Footer>
			</Modal>

			{/* Debug Modal */}
			<Modal show={showDebug} centered onHide={() => setShowDebug(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Gamepad Debug</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{/* Debug Information Section */}
					<div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
						<h6>Debug Information</h6>
						<small>
							<strong>InputDevice gamepads:</strong> {InputDevice.gamepads?.length || 0}<br/>
							<strong>Native gamepads:</strong> {Array.from(navigator.getGamepads()).filter(Boolean).length}<br/>
							<strong>InputDevice initialized:</strong> {InputDevice.gamepads ? 'Yes' : 'No'}<br/>
							<strong>Check console for detailed logs</strong><br/>
							<br/>
							<strong>Gamepad Controls:</strong><br/>
						• Left thumbstick = Move ship (continuous)<br/>
						• Right thumbstick Y = Zoom in/out (continuous)<br/>
						• D-pad = Move ship OR navigate menu (on release)<br/>
						• Start/+ or Select/- = Pause Menu (on release)<br/>
						• A button = Activate/Select (on release)<br/>
						• B button = Back/Close menu (on release)
						</small>
						<div style={{ marginTop: '10px' }}>
							<Button
								size="sm"
								variant="outline-primary"
								onClick={() => {
									console.log('[DEBUG] Manual gamepad refresh triggered');
									console.log('[DEBUG] InputDevice.gamepads:', InputDevice.gamepads.length);
									console.log('[DEBUG] navigator.getGamepads():', Array.from(navigator.getGamepads()).filter(Boolean).length);
									// Force a re-render of gamepad state
									const currentState = InputDevice.gamepads.map(gp => ({
										id: gp.id,
										buttons: Object.entries(gp.button).map(([name, btn]: [string, any]) => ({ name, pressed: !!btn })),
										leftJoystick: gp.leftJoystick,
										rightJoystick: gp.rightJoystick,
									}));
									setGamepadDebugState(currentState);
								}}
							>
							Refresh Gamepad Detection
							</Button>
						</div>
					</div>

					{gamepadDebugState && gamepadDebugState.length === 0 && (
						<div style={{ color: 'orange', fontWeight: 'bold' }}>
						No gamepads detected by InputDevice.
							<br/><small>Try connecting a gamepad and pressing any button, then refresh this debug panel.</small>
						</div>
					)}
					{gamepadDebugState && gamepadDebugState.map((pad: any, idx: number) => (
						<div key={pad.id} style={{ marginBottom: 16 }}>
							<h6>Gamepad #{idx + 1}: {pad.id}</h6>
							<Table size="sm" bordered>
								<thead>
									<tr><th>Button</th><th>Pressed</th></tr>
								</thead>
								<tbody>
									{pad.buttons.map((btn: any, i: number) => (
										<tr key={i}>
											<td>{btn.name}</td>
											<td>{btn.pressed ? 'Yes' : ''}</td>
										</tr>
									))}
								</tbody>
							</Table>
							<Table size="sm" bordered>
								<thead>
									<tr><th>Stick</th><th>X</th><th>Y</th></tr>
								</thead>
								<tbody>
									<tr><td>Left</td><td>{pad.leftJoystick.x.toFixed(2)}</td><td>{pad.leftJoystick.y.toFixed(2)}</td></tr>
									<tr><td>Right</td><td>{pad.rightJoystick.x.toFixed(2)}</td><td>{pad.rightJoystick.y.toFixed(2)}</td></tr>
								</tbody>
							</Table>
						</div>
					))}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowDebug(false)}>Close</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	);
};
