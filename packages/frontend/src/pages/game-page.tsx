import { Ticker } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { InputDevice } from 'pixijs-input-devices';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Container, Modal, Form, Row, Col, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router';

import { renderGoogleSignInButton } from '../auth/google-auth';
import { InventoryModal } from '../components/inventory-modal';
import { ResourceBar } from '../components/resource-bar';
import { GAMEPAD_BUTTONS } from '../constants/gamepad';
import { useAuth } from '../contexts/auth-context';
import { useGameState } from '../contexts/game-state-context';
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
	const [showInventory, setShowInventory] = useState(false);
	const [inventoryTab, setInventoryTab] = useState(0);
	const [speed, setSpeed] = useState(4);
	const [keybindings, setKeybindings] = useState<Keybindings>(DEFAULT_KEYBINDINGS);
	const [gamepadBindings, setGamepadBindings] = useState<GamepadBindings>(DEFAULT_GAMEPAD_BINDINGS);
	const [listeningKey, setListeningKey] = useState<{ action: string; index: number } | null>(null);
	const [focusedMenuItem, setFocusedMenuItem] = useState(0); // Track focused menu item
	const [gamepadDebugState, setGamepadDebugState] = useState<any[]>([]); // Debug state for gamepad info
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showReAuthModal, setShowReAuthModal] = useState(false);

	// Use the centralized game controller service
	const controller = useGameController();

	// Authentication state
	const auth = useAuth();

	// Game state for resource management
	const gameState = useGameState();

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
			try {
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
			} catch (error) {
				console.error('[GAME-PAGE] Failed to initialize game:', error);
				// Display error to user - likely API connection issue
				if (canvasRef.current) {
					canvasRef.current.innerHTML = `
						<div style="
							display: flex;
							align-items: center;
							justify-content: center;
							height: 100vh;
							color: #ff6b6b;
							font-size: 18px;
							text-align: center;
							background: #1a1a1a;
							padding: 20px;
						">
							<div>
								<h3>Game Initialization Failed</h3>
								<p>Unable to connect to game servers.</p>
								<p>Please check your authentication and try refreshing the page.</p>
								<small>Error: ${error instanceof Error ? error.message : 'Unknown error'}</small>
							</div>
						</div>
					`;
				}
			}
		})();

		return () => {
			destroyed = true;
			if (pixiAppRef.current) {
				pixiAppRef.current.destroy(true);
				pixiAppRef.current = null;
			}
		};

	}, [speed, keybindings, gamepadBindings]);

	// Use refs to avoid stale closure issues
	const stateRef = useRef({
		showPause,
		showSettings,
		showDebug,
		showInventory,
		focusedMenuItem,
		inventoryTab,
	});

	// Update refs when state changes
	useEffect(() => {
		stateRef.current = {
			showPause,
			showSettings,
			showDebug,
			showInventory,
			focusedMenuItem,
			inventoryTab,
		};
	}, [showPause, showSettings, showDebug, showInventory, focusedMenuItem, inventoryTab]);

	// Game controller event subscriptions
	useEffect(() => {
		if (!controller.isConnected) return;

		console.log('[GAME-PAGE-CONTROLLER] Setting up controller event subscriptions');

		// Pause button handling (BACK button only)
		const unsubscribePauseBack = controller.onButtonRelease('BACK', () => {
			console.log('[GAME-PAGE-CONTROLLER] BACK button released - toggling pause');
			setShowPause(prev => {
				console.log('[GAME-PAGE-CONTROLLER] Pause toggled from', prev, 'to', !prev);
				return !prev;
			});
			setFocusedMenuItem(0);
		});

		// Inventory button handling (START button)
		const unsubscribeInventory = controller.onButtonRelease('START', () => {
			console.log('[GAME-PAGE-CONTROLLER] START button released - toggling inventory');
			setShowInventory(prev => {
				console.log('[GAME-PAGE-CONTROLLER] Inventory toggled from', prev, 'to', !prev);
				return !prev;
			});
			setInventoryTab(0);
		});

		// Left D-pad (decrease time speed)
		const unsubscribeLeftDpad = controller.onButtonRelease('DPAD_LEFT', () => {
			if (!showPause && !showInventory) { // Only when not in menus
				const currentSpeed = gameState.destinyStatus?.time_speed || 1;
				const speeds = [0, 1, 5, 10];
				const currentIndex = speeds.indexOf(currentSpeed);
				const newIndex = Math.max(0, currentIndex - 1);
				gameState.setTimeSpeed(speeds[newIndex]);
				console.log('[GAME-PAGE-CONTROLLER] Left D-pad - decreased time speed to', speeds[newIndex]);
			}
		});

		// Right D-pad (increase time speed)
		const unsubscribeRightDpad = controller.onButtonRelease('DPAD_RIGHT', () => {
			if (!showPause && !showInventory) { // Only when not in menus
				const currentSpeed = gameState.destinyStatus?.time_speed || 1;
				const speeds = [0, 1, 5, 10];
				const currentIndex = speeds.indexOf(currentSpeed);
				const newIndex = Math.min(speeds.length - 1, currentIndex + 1);
				gameState.setTimeSpeed(speeds[newIndex]);
				console.log('[GAME-PAGE-CONTROLLER] Right D-pad - increased time speed to', speeds[newIndex]);
			}
		});

		// Menu navigation (only when menus are open)
		const unsubscribeUpNav = controller.onButtonRelease('DPAD_UP', () => {
			const state = stateRef.current;
			if (state.showPause || state.showSettings || state.showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad UP released - menu navigation');
				const menuItemCount = state.showPause ? 5 : 1;
				setFocusedMenuItem(prev => (prev > 0 ? prev - 1 : menuItemCount - 1));
			} else if (state.showInventory) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad UP released - inventory tab navigation');
				setInventoryTab(prev => (prev > 0 ? prev - 1 : 4));
			}
		});

		const unsubscribeDownNav = controller.onButtonRelease('DPAD_DOWN', () => {
			const state = stateRef.current;
			if (state.showPause || state.showSettings || state.showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad DOWN released - menu navigation');
				const menuItemCount = state.showPause ? 5 : 1;
				setFocusedMenuItem(prev => (prev < menuItemCount - 1 ? prev + 1 : 0));
			} else if (state.showInventory) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad DOWN released - inventory tab navigation');
				setInventoryTab(prev => (prev < 4 ? prev + 1 : 0));
			}
		});

		// Menu back button (B button)
		const unsubscribeMenuBack = controller.onButtonRelease('B', () => {
			const state = stateRef.current;
			if (state.showPause || state.showSettings || state.showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] B button released - closing menus');
				setShowPause(false);
				setShowSettings(false);
				setShowDebug(false);
			} else if (state.showInventory) {
				console.log('[GAME-PAGE-CONTROLLER] B button released - closing inventory');
				setShowInventory(false);
			}
		});

		// Menu activate button (A button)
		const unsubscribeMenuActivate = controller.onButtonRelease('A', () => {
			const state = stateRef.current;
			if (state.showPause) {
				console.log('[GAME-PAGE-CONTROLLER] A button released - activating menu item:', state.focusedMenuItem);
				switch (state.focusedMenuItem) {
				case 0: // Resume
					console.log('[GAME-PAGE-CONTROLLER] Resuming game');
					setShowPause(false);
					break;
				case 1: // Main Menu
					console.log('[GAME-PAGE-CONTROLLER] Navigating to main menu');
					navigate('/');
					break;
				case 2: // Save Game
					console.log('[GAME-PAGE-CONTROLLER] Saving game');
					gameState.saveGame();
					setShowPause(false);
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
			} else if (state.showSettings) {
				console.log('[GAME-PAGE-CONTROLLER] Closing settings menu');
				setShowSettings(false);
			} else if (state.showDebug) {
				console.log('[GAME-PAGE-CONTROLLER] Closing debug menu');
				setShowDebug(false);
			} else if (state.showInventory) {
				console.log('[GAME-PAGE-CONTROLLER] A button released - inventory interaction');
				// For now, just close inventory on A press - could add item selection later
				setShowInventory(false);
			}
		});

		// Cleanup subscriptions
		return () => {
			console.log('[GAME-PAGE-CONTROLLER] Cleaning up controller subscriptions');
			unsubscribePauseBack();
			unsubscribeInventory();
			unsubscribeLeftDpad();
			unsubscribeRightDpad();
			unsubscribeUpNav();
			unsubscribeDownNav();
			unsubscribeMenuBack();
			unsubscribeMenuActivate();
		};
	}, [controller]);

	// Update game menu state when any menu opens/closes
	useEffect(() => {
		if (gameRef.current) {
			const menuOpen = showPause || showSettings || showDebug || showInventory;
			gameRef.current.setMenuOpen(menuOpen);
			console.log('[GAME-PAGE-CONTROLLER] Game menu state updated:', {
				menuOpen,
				showPause,
				showSettings,
				showDebug,
				showInventory,
				timestamp: new Date().toISOString(),
			});
		}
	}, [showPause, showSettings, showDebug, showInventory]);

	// Keyboard controls
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setShowPause((prev) => !prev);
			}
			if (e.key === 'i' || e.key === 'I' || e.key === 'Tab') {
				e.preventDefault();
				setShowInventory((prev) => !prev);
				setInventoryTab(0);
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

	// Monitor FTL status changes and update game background
	useEffect(() => {
		if (gameRef.current && gameState.destinyStatus) {
			gameRef.current.updateFTLStatus(gameState.destinyStatus.ftl_status);
		}
	}, [gameState.destinyStatus?.ftl_status]);

	// Restore player position when game state changes (after game load)
	useEffect(() => {
		if (gameRef.current && gameState.playerPosition) {
			const { x, y, roomId } = gameState.playerPosition;
			gameRef.current.setPlayerPosition(x, y, roomId);
			console.log('[GAME-PAGE] Player position restored:', { x, y, roomId });
		}
	}, [gameState.playerPosition]);

	// Restore door states when game state changes (after game load)
	useEffect(() => {
		if (gameRef.current && gameState.doorStates && gameState.doorStates.length > 0) {
			gameRef.current.restoreDoorStates(gameState.doorStates);
			console.log('[GAME-PAGE] Door states restored:', gameState.doorStates.length, 'doors');
		}
	}, [gameState.doorStates]);

	// Sync player position from Game engine to GameState periodically
	useEffect(() => {
		if (!gameRef.current || !gameState.isInitialized) return;

		const syncInterval = setInterval(() => {
			if (gameRef.current) {
				const currentPosition = gameRef.current.getPlayerPosition();
				const currentRoomId = gameRef.current.getCurrentRoomId();

				// Only update if position has changed significantly (avoid excessive updates)
				if (gameState.playerPosition) {
					const { x: oldX, y: oldY, roomId: oldRoomId } = gameState.playerPosition;
					const positionChanged = Math.abs(currentPosition.x - oldX) > 5 ||
											Math.abs(currentPosition.y - oldY) > 5 ||
											currentRoomId !== oldRoomId;

					if (positionChanged) {
						gameState.setPlayerPosition({
							x: currentPosition.x,
							y: currentPosition.y,
							roomId: currentRoomId || undefined,
						});
						console.log('[GAME-PAGE] Player position synced:', currentPosition, 'room:', currentRoomId);
					}
				} else {
					// First time setting position
					gameState.setPlayerPosition({
						x: currentPosition.x,
						y: currentPosition.y,
						roomId: currentRoomId || undefined,
					});
				}
			}
		}, 2000); // Sync every 2 seconds

		return () => clearInterval(syncInterval);
	}, [gameState.isInitialized, gameState.setPlayerPosition]);

	// Handle token expiration during gameplay
	useEffect(() => {
		if (auth.isTokenExpired && auth.user) {
			// Only show re-auth modal if user was previously authenticated
			setShowReAuthModal(true);
		} else {
			setShowReAuthModal(false);
		}
	}, [auth.isTokenExpired, auth.user]);

	// Handle Google Sign-In for re-authentication
	const handleReAuthentication = async (idToken: string) => {
		try {
			await auth.reAuthenticate(idToken);
			setShowReAuthModal(false);
		} catch (error) {
			// Error handling is done in the auth context
		}
	};

	// Set up Google Sign-In button for re-authentication modal
	useEffect(() => {
		if (showReAuthModal) {
			const timer = setTimeout(() => {
				const container = document.getElementById('reauth-google-signin-button');
				if (container) {
					container.innerHTML = ''; // Clear any existing content
					renderGoogleSignInButton('reauth-google-signin-button', handleReAuthentication);
				}
			}, 100); // Small delay to ensure DOM is ready

			return () => clearTimeout(timer);
		}
	}, [showReAuthModal]);

	// Show loading state while game initializes
	if (!gameState.isInitialized || !gameState.destinyStatus) {
		return (
			<Container fluid style={{ padding: 0, background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ color: 'white', fontSize: '24px' }}>
					{gameState.isLoading ? 'Loading game...' : 'Initializing game...'}
				</div>
			</Container>
		);
	}

	const destinyStatus = gameState.destinyStatus;

	return (
		<Container
			fluid
			style={{
				padding: 0,
				background: '#000',
				minHeight: '100vh',
				position: 'relative',
				cursor: isFullscreen ? 'none' : 'default',
			}}
		>
			{/* Resource Bar */}
			<ResourceBar
				power={destinyStatus.power}
				maxPower={destinyStatus.max_power}
				shields={destinyStatus.shields}
				maxShields={destinyStatus.max_shields}
				hull={destinyStatus.hull}
				maxHull={destinyStatus.max_hull}
				water={destinyStatus.water}
				maxWater={destinyStatus.max_water}
				food={destinyStatus.food}
				maxFood={destinyStatus.max_food}
				spareParts={destinyStatus.spare_parts}
				maxSpareParts={destinyStatus.max_spare_parts}
				medicalSupplies={destinyStatus.medical_supplies}
				maxMedicalSupplies={destinyStatus.max_medical_supplies}
				co2={destinyStatus.co2}
				o2={destinyStatus.o2}
				currentTime={destinyStatus.current_time}
				ftlStatus={destinyStatus.ftl_status}
				nextFtlTransition={destinyStatus.next_ftl_transition}
				timeSpeed={destinyStatus.time_speed}
				characterCount={gameState.characters.length || 4}
			/>

			{!isFullscreen && (
				<div style={{ position: 'absolute', top: 56, left: 16, zIndex: 10 }}>
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
					cursor: isFullscreen ? 'none' : 'default',
					paddingTop: '48px', // Add padding for resource bar
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
							onClick={() => {
								gameState.saveGame();
								setShowPause(false);
							}}
							disabled={gameState.isLoading}
							title={gameState.gameName ? `Save "${gameState.gameName}"` : 'Save current game'}
							style={focusedMenuItem === 2 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
							{gameState.isLoading ? 'Saving...' : 'Save Game'}
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

			{/* Inventory Modal */}
			<InventoryModal
				show={showInventory}
				onHide={() => setShowInventory(false)}
				destinyStatus={destinyStatus}
				characters={gameState.characters}
				technologies={gameState.technologies}
				exploredRooms={gameState.exploredRooms}
				focusedTab={inventoryTab}
				onTabChange={setInventoryTab}
				onStartFTLJump={gameState.startFTLJump}
				onExitFTL={gameState.exitFTL}
				onSetTimeSpeed={gameState.setTimeSpeed}
			/>

			{/* Re-Authentication Modal */}
			<Modal show={showReAuthModal} centered backdrop="static" keyboard={false}>
				<Modal.Header>
					<Modal.Title>Session Expired</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className="text-center">
						<p className="mb-3">
							Your session has expired, but don&apos;t worry - your game progress is safe!
						</p>
						<p className="mb-4">
							Please sign in again to continue saving your progress to the server.
						</p>
						<div id="reauth-google-signin-button" className="d-flex justify-content-center" />
						<div className="mt-3">
							<small className="text-muted">
								You can continue playing without signing in, but your progress won&apos;t be saved to the server.
							</small>
						</div>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button
						variant="secondary"
						onClick={() => setShowReAuthModal(false)}
						title="Continue playing without server saves"
					>
						Continue Offline
					</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	);
};
