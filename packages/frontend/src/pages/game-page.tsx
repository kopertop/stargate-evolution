import * as PIXI from 'pixi.js';
import { InputDevice } from 'pixijs-input-devices';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Container, Modal, Form, Row, Col, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router';

import { renderGoogleSignInButton } from '../auth/google-auth';
import { ElevatorConsoleModal, type ElevatorConfig } from '../components/elevator-console-modal';
import { InventoryModal } from '../components/inventory-modal';
import { ResourceBar } from '../components/resource-bar';
import { TouchControlsHelp } from '../components/touch-controls-help';
import { TouchFeedback } from '../components/touch-feedback';
import { GAMEPAD_BUTTONS } from '../constants/gamepad';
import { useAuth } from '../contexts/auth-context';
import { Game } from '../game';
import { useGameEngineSync } from '../hooks/use-game-engine-sync';
import { useGameController } from '../services/game-controller';
import { useGameStore } from '../stores/game-store';
import { onFullscreenChange, getDeviceInfo, isMobileDevice } from '../utils/mobile-utils';

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

// Props interface for the GameRenderer component
interface GameRendererProps {
	gameId: string;
	savedGameData: any;
}

// Separate component that handles the actual game rendering
const GameRenderer: React.FC<GameRendererProps> = ({ gameId, savedGameData }) => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const pixiAppRef = useRef<PIXI.Application | null>(null);
	const gameRef = useRef<Game | null>(null);
	const navigate = useNavigate();
	const [showPause, setShowPause] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showDebug, setShowDebug] = useState(false);
	const [showInventory, setShowInventory] = useState(false);
	const [inventoryTab, setInventoryTab] = useState(0);
	const [showElevatorConsole, setShowElevatorConsole] = useState(false);
	const [elevatorConfig, setElevatorConfig] = useState<ElevatorConfig | null>(null);
	const [speed, setSpeed] = useState(4);
	const [keybindings, setKeybindings] = useState<Keybindings>(DEFAULT_KEYBINDINGS);
	const [gamepadBindings, setGamepadBindings] = useState<GamepadBindings>(DEFAULT_GAMEPAD_BINDINGS);
	const [listeningKey, setListeningKey] = useState<{ action: string; index: number } | null>(null);
	const [focusedMenuItem, setFocusedMenuItem] = useState(0); // Track focused menu item
	const [gamepadDebugState, setGamepadDebugState] = useState<any[]>([]); // Debug state for gamepad info
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showReAuthModal, setShowReAuthModal] = useState(false);
	const [showLoginModal, setShowLoginModal] = useState(false);

	// Use the centralized game controller service
	const controller = useGameController();

	// Authentication state
	const auth = useAuth();

	// Game state for resource management
	const gameState = useGameStore();

	// Sync game engine with store
	const { syncToStore, syncToEngine } = useGameEngineSync(gameRef);

	// Fullscreen detection
	useEffect(() => {
		const handleFullscreenChange = (isCurrentlyFullscreen: boolean) => {
			setIsFullscreen(isCurrentlyFullscreen);
			console.log('[FULLSCREEN] Fullscreen state changed:', isCurrentlyFullscreen);
		};

		// Use our centralized fullscreen detection
		const cleanup = onFullscreenChange(handleFullscreenChange);

		// Check initial state
		const device = getDeviceInfo();
		handleFullscreenChange(device.isFullscreen);

		return cleanup;
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
					// Floor management - sync with React context
					currentFloor: gameState.currentFloor,
					onFloorChange: (newFloor: number) => {
						console.log('[GAME-PAGE] Floor change from Game:', newFloor);
						gameState.setCurrentFloor(newFloor);
					},
					// Elevator system
					onElevatorActivation: (config: ElevatorConfig, currentFloor: number) => {
						console.log('[GAME-PAGE] Elevator activation requested:', config);
						setElevatorConfig(config);
						setShowElevatorConsole(true);
					},
				});
				gameRef.current = game;

				// Restore game state if there's saved data from props
				if (savedGameData) {
					console.log('[GAME-RENDERER] Restoring game state from saved data');
					game.loadFromJSON(savedGameData);
				}
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

			// Clean up game instance first
			if (gameRef.current) {
				try {
					gameRef.current.destroy();
				} catch (error) {
					console.warn('[GAME-PAGE] Error destroying game:', error);
				} finally {
					gameRef.current = null;
				}
			}

			// Clean up PIXI app
			if (pixiAppRef.current) {
				try {
					// Remove from DOM before destroying
					if (pixiAppRef.current.canvas?.parentNode) {
						pixiAppRef.current.canvas.parentNode.removeChild(pixiAppRef.current.canvas);
					}
					pixiAppRef.current.destroy(true, { children: true, texture: true });
				} catch (error) {
					console.warn('[GAME-PAGE] Error destroying PIXI app:', error);
				} finally {
					pixiAppRef.current = null;
				}
			}
		};

	}, [speed, keybindings, gamepadBindings, savedGameData, gameState.currentFloor]);


	// Use refs to avoid stale closure issues
	const stateRef = useRef({
		showPause,
		showSettings,
		showDebug,
		showInventory,
		showElevatorConsole,
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
			showElevatorConsole,
			focusedMenuItem,
			inventoryTab,
		};
	}, [showPause, showSettings, showDebug, showInventory, showElevatorConsole, focusedMenuItem, inventoryTab]);

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

		// Left bumper (LB) - decrease time speed (global)
		const unsubscribeLeftBumper = controller.onButtonRelease('LB', () => {
			const currentSpeed = gameState.destinyStatus?.time_speed || 1;
			const speeds = [0, 1, 60, 1800, 3600]; // 0x (pause), 1x (real-time), 1 min/sec, 30 min/sec, 1 hr/sec
			const currentIndex = speeds.indexOf(currentSpeed);
			const newIndex = Math.max(0, currentIndex - 1);
			gameState.setTimeSpeed(speeds[newIndex]);
			console.log('[GAME-PAGE-CONTROLLER] Left bumper (LB) - decreased time speed to', speeds[newIndex]);
		});

		// Right bumper (RB) - increase time speed (global)
		const unsubscribeRightBumper = controller.onButtonRelease('RB', () => {
			const currentSpeed = gameState.destinyStatus?.time_speed || 1;
			const speeds = [0, 1, 60, 1800, 3600]; // 0x (pause), 1x (real-time), 1 min/sec, 30 min/sec, 1 hr/sec
			const currentIndex = speeds.indexOf(currentSpeed);
			const newIndex = Math.min(speeds.length - 1, currentIndex + 1);
			gameState.setTimeSpeed(speeds[newIndex]);
			console.log('[GAME-PAGE-CONTROLLER] Right bumper (RB) - increased time speed to', speeds[newIndex]);
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
			} else if (state.showElevatorConsole) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad UP released - elevator floor navigation');
				setFocusedMenuItem(prev => (prev > 0 ? prev - 1 : (elevatorConfig?.accessibleFloors.length || 1) - 1));
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
			} else if (state.showElevatorConsole) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad DOWN released - elevator floor navigation');
				const maxItems = (elevatorConfig?.accessibleFloors.length || 1) - 1;
				setFocusedMenuItem(prev => (prev < maxItems ? prev + 1 : 0));
			}
		});

		// D-pad left/right for inventory tab navigation when in inventory
		const unsubscribeLeftNav = controller.onButtonRelease('DPAD_LEFT', () => {
			const state = stateRef.current;
			if (state.showInventory) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad LEFT released - inventory tab navigation');
				setInventoryTab(prev => (prev > 0 ? prev - 1 : 4));
			}
		});

		const unsubscribeRightNav = controller.onButtonRelease('DPAD_RIGHT', () => {
			const state = stateRef.current;
			if (state.showInventory) {
				console.log('[GAME-PAGE-CONTROLLER] D-pad RIGHT released - inventory tab navigation');
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
			} else if (state.showElevatorConsole) {
				console.log('[GAME-PAGE-CONTROLLER] B button released - closing elevator console');
				setShowElevatorConsole(false);
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
					gameState.saveGame(undefined, gameRef.current);
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
			} else if (state.showElevatorConsole) {
				console.log('[GAME-PAGE-CONTROLLER] A button released - elevator floor selection:', state.focusedMenuItem);
				if (elevatorConfig && elevatorConfig.accessibleFloors.length > state.focusedMenuItem) {
					const sortedFloors = [...elevatorConfig.accessibleFloors].sort((a, b) => b - a);
					const selectedFloor = sortedFloors[state.focusedMenuItem];
					if (selectedFloor !== elevatorConfig.currentFloor) {
						handleFloorSelect(selectedFloor);
					}
				}
				setShowElevatorConsole(false);
			}
		});

		// Cleanup subscriptions
		return () => {
			console.log('[GAME-PAGE-CONTROLLER] Cleaning up controller subscriptions');
			unsubscribePauseBack();
			unsubscribeInventory();
			unsubscribeLeftBumper();
			unsubscribeRightBumper();
			unsubscribeUpNav();
			unsubscribeDownNav();
			unsubscribeLeftNav();
			unsubscribeRightNav();
			unsubscribeMenuBack();
			unsubscribeMenuActivate();
		};
	}, [controller]);

	// Update game menu state when any menu opens/closes
	useEffect(() => {
		if (gameRef.current) {
			const menuOpen = showPause || showSettings || showDebug || showInventory || showElevatorConsole;
			gameRef.current.setMenuOpen(menuOpen);
			console.log('[GAME-PAGE-CONTROLLER] Game menu state updated:', {
				menuOpen,
				showPause,
				showSettings,
				showDebug,
				showInventory,
				showElevatorConsole,
				timestamp: new Date().toISOString(),
			});
		}
	}, [showPause, showSettings, showDebug, showInventory, showElevatorConsole]);

	// Handle elevator floor selection
	const handleFloorSelect = useCallback((targetFloor: number) => {
		console.log('[GAME-PAGE] Floor selected:', targetFloor);

		if (!gameRef.current || !elevatorConfig) {
			console.warn('[GAME-PAGE] No game instance or elevator config available');
			return;
		}

		// Use the new handleElevatorTransition method for proper floor transitions
		const success = gameRef.current.handleElevatorTransition(targetFloor);
		if (!success) {
			console.warn('[GAME-PAGE] Failed to handle elevator transition to floor:', targetFloor);
			return;
		}

		// The game engine's handleElevatorTransition method will:
		// 1. Save current position for the old floor
		// 2. Change to target floor (triggers onFloorChange callback)
		// 3. Set player position to elevator location
		// 4. Handle fog restoration internally

		console.log('[GAME-PAGE] Player transported to floor', targetFloor);

		// Close the modal after a brief delay to allow the transition animation to complete
		setTimeout(() => {
			setShowElevatorConsole(false);
		}, 100);
	}, [gameRef, elevatorConfig]);

	// Keyboard controls
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Handle elevator console navigation
			if (showElevatorConsole) {
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					setFocusedMenuItem(prev => (prev > 0 ? prev - 1 : (elevatorConfig?.accessibleFloors.length || 1) - 1));
				} else if (e.key === 'ArrowDown') {
					e.preventDefault();
					const maxItems = (elevatorConfig?.accessibleFloors.length || 1) - 1;
					setFocusedMenuItem(prev => (prev < maxItems ? prev + 1 : 0));
				} else if (e.key === 'Enter') {
					e.preventDefault();
					if (elevatorConfig && elevatorConfig.accessibleFloors.length > focusedMenuItem) {
						const sortedFloors = [...elevatorConfig.accessibleFloors].sort((a, b) => b - a);
						const selectedFloor = sortedFloors[focusedMenuItem];
						if (selectedFloor !== elevatorConfig.currentFloor) {
							handleFloorSelect(selectedFloor);
						}
					}
					setShowElevatorConsole(false);
				} else if (e.key === 'Escape') {
					e.preventDefault();
					setShowElevatorConsole(false);
				}
				return; // Don't process other keys when elevator console is open
			}

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
	}, [listeningKey, showElevatorConsole, elevatorConfig, focusedMenuItem, handleFloorSelect]);

	// Monitor FTL status changes and update game background
	useEffect(() => {
		if (gameRef.current && gameState.destinyStatus) {
			gameRef.current.updateFTLStatus(gameState.destinyStatus.ftl_status);
		}
	}, [gameState.destinyStatus?.ftl_status]);

	// Game state restoration is now handled via props in the PixiJS useEffect

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

	// Handle Google Sign-In for initial login
	const handleLogin = async (idToken: string) => {
		try {
			await auth.signIn(idToken);
			setShowLoginModal(false);
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

	// Set up Google Sign-In button for login modal
	useEffect(() => {
		if (showLoginModal) {
			const timer = setTimeout(() => {
				const container = document.getElementById('login-google-signin-button');
				if (container) {
					container.innerHTML = ''; // Clear any existing content
					renderGoogleSignInButton('login-google-signin-button', handleLogin);
				}
			}, 100); // Small delay to ensure DOM is ready

			return () => clearTimeout(timer);
		}
	}, [showLoginModal]);

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
				onTimeSpeedChange={gameState.setTimeSpeed}
				onShowPause={() => setShowPause(true)}
				characterCount={gameState.characters.length || 4}
			/>
			<div
				ref={canvasRef}
				style={{
					width: '100vw',
					height: '100vh',
					overflow: 'hidden',
					position: 'relative',
					zIndex: 1,
					cursor: isFullscreen ? 'none' : 'default',
					...(isMobileDevice() ? {
						paddingBottom: '48px', // Padding for bottom resource bar on mobile
					} : {
						paddingTop: '48px', // Padding for top resource bar on desktop
					}),
				}}
			/>

			{/* Touch Feedback Component for mobile */}
			<TouchFeedback />

			{/* Touch Controls Help for mobile */}
			<TouchControlsHelp gameStarted={true} />

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
								if (!auth.user) {
									setShowLoginModal(true);
									setShowPause(false);
								} else {
									gameState.saveGame(undefined, gameRef.current);
									setShowPause(false);
								}
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

			{/* Elevator Console Modal */}
			<ElevatorConsoleModal
				show={showElevatorConsole}
				onHide={() => setShowElevatorConsole(false)}
				elevatorConfig={elevatorConfig}
				onFloorSelect={handleFloorSelect}
				focusedMenuItem={focusedMenuItem}
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

			{/* Login Modal */}
			<Modal show={showLoginModal} centered backdrop="static" keyboard={false}>
				<Modal.Header>
					<Modal.Title>Sign In Required</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className="text-center">
						<p className="mb-3">
							You need to sign in to save your game progress to the server.
						</p>
						<p className="mb-4">
							Sign in with Google to save your progress and access it from any device.
						</p>
						<div id="login-google-signin-button" className="d-flex justify-content-center" />
						<div className="mt-3">
							<small className="text-muted">
								You can continue playing without signing in, but your progress will only be saved locally.
							</small>
						</div>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button
						variant="secondary"
						onClick={() => setShowLoginModal(false)}
						title="Continue playing without server saves"
					>
						Continue Without Saving
					</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	);
};

export const GamePage: React.FC = () => {
	const { id: gameIdFromUrl } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const auth = useAuth();
	const gameState = useGameStore();
	const [savedGameData, setSavedGameData] = useState<any>(null);
	const [isLoadingGameData, setIsLoadingGameData] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	// Handle game ID from URL - load the correct game if needed
	useEffect(() => {
		const handleGameFromUrl = async () => {
			if (!gameIdFromUrl) {
				console.log('[GAME-PAGE] No game ID in URL - redirecting to menu');
				navigate('/');
				return;
			}

			// Wait for auth to finish loading
			if (auth.isLoading) {
				console.log('[GAME-PAGE] Auth still loading - waiting...');
				return;
			}

			// If we already have the correct game loaded, get the full saved data
			if (gameState.gameId === gameIdFromUrl && gameState.isInitialized) {
				console.log('[GAME-PAGE] Correct game already loaded:', gameIdFromUrl);

				// Check for auto-save data first (most recent)
				const autoSaveData = gameState.getAutoSaveData(gameIdFromUrl);
				if (autoSaveData) {
					console.log('[GAME-PAGE] Found auto-save data, using for restoration');
					setSavedGameData(autoSaveData);
					return;
				}

				// Fallback to full game data from localStorage
				const storedGameData = localStorage.getItem(`stargate-game-${gameIdFromUrl}`);
				if (storedGameData) {
					try {
						const fullGameData = JSON.parse(storedGameData);
						console.log('[GAME-PAGE] Using full stored game data for restoration');
						setSavedGameData(fullGameData);
						return;
					} catch (error) {
						console.warn('[GAME-PAGE] Failed to parse stored game data:', error);
					}
				}

				// Fallback: create basic game data from current context (may be missing engine data)
				console.warn('[GAME-PAGE] No stored game data found - using context data only');
				const gameData = {
					destinyStatus: gameState.destinyStatus,
					characters: gameState.characters,
					technologies: gameState.technologies,
					exploredRooms: gameState.exploredRooms,
					explorationProgress: gameState.explorationProgress,
					currentGalaxy: gameState.currentGalaxy,
					currentSystem: gameState.currentSystem,
					knownGalaxies: gameState.knownGalaxies,
					knownSystems: gameState.knownSystems,
				};
				setSavedGameData(gameData);
				return;
			}

			// Check authentication - allow unauthenticated users for local games
			if (!auth.isAuthenticated || auth.isTokenExpired) {
				// Allow access to local games without authentication
				if (gameIdFromUrl.startsWith('local-')) {
					console.log('[GAME-PAGE] Unauthenticated user accessing local game - allowing access');
				} else {
					console.log('[GAME-PAGE] User not authenticated and trying to access server game - redirecting to menu');
					navigate('/');
					return;
				}
			}

			// If we have a different game loaded, or no game loaded, try to load the URL game
			if (gameState.gameId !== gameIdFromUrl) {
				console.log('[GAME-PAGE] Loading game from URL:', gameIdFromUrl, 'current:', gameState.gameId);
				setIsLoadingGameData(true);
				setLoadError(null);

				try {
					// Check if this is a local game
					if (gameIdFromUrl.startsWith('local-')) {
						console.log('[GAME-PAGE] Loading local game from localStorage:', gameIdFromUrl);

						// Check for auto-save data first (most recent for local games)
						const autoSaveData = gameState.getAutoSaveData(gameIdFromUrl);
						let gameData;

						if (autoSaveData) {
							console.log('[GAME-PAGE] Found auto-save data for local game, using for restoration');
							gameData = autoSaveData;
						} else {
							// Try to load from localStorage
							const storedGameData = localStorage.getItem(`stargate-game-${gameIdFromUrl}`);
							if (!storedGameData) {
								throw new Error('Local game data not found. The game may have been deleted.');
							}
							gameData = JSON.parse(storedGameData);
						}

						// Set context state directly for local games
						gameState.setGameId(gameIdFromUrl);
						gameState.setGameName(localStorage.getItem('stargate-current-game-name') || 'Local Game');
						gameState.setDestinyStatus(gameData.destinyStatus);
						gameState.setCharacters(gameData.characters || []);
						gameState.setTechnologies(gameData.technologies || []);
						gameState.setExploredRooms(gameData.exploredRooms || []);
						gameState.setExplorationProgress(gameData.explorationProgress || []);
						gameState.setCurrentGalaxy(gameData.currentGalaxy || null);
						gameState.setCurrentSystem(gameData.currentSystem || null);
						gameState.setKnownGalaxies(gameData.knownGalaxies || []);
						gameState.setKnownSystems(gameData.knownSystems || []);

						// Update localStorage to current game
						localStorage.setItem('stargate-current-game-id', gameIdFromUrl);

						console.log('[GAME-PAGE] Local game loaded successfully:', gameIdFromUrl);
						setSavedGameData(gameData);

						// Mark game as initialized
						gameState.setIsInitialized(true);
					} else {
						// Backend game - use the existing loadGame method
						await gameState.loadGame(gameIdFromUrl);
						console.log('[GAME-PAGE] Successfully loaded game from URL:', gameIdFromUrl);

						// Check for auto-save data first (most recent)
						const autoSaveData = gameState.getAutoSaveData(gameIdFromUrl);
						if (autoSaveData) {
							console.log('[GAME-PAGE] Found auto-save data for backend game, using for restoration');
							setSavedGameData(autoSaveData);
						} else {
							// Get the full game data that was just loaded and stored in localStorage
							const storedGameData = localStorage.getItem(`stargate-game-${gameIdFromUrl}`);
							if (storedGameData) {
								try {
									const fullGameData = JSON.parse(storedGameData);
									console.log('[GAME-PAGE] Setting full loaded game data for restoration');
									setSavedGameData(fullGameData);
								} catch (error) {
									console.warn('[GAME-PAGE] Failed to parse newly loaded game data:', error);
								}
							}
						}
					}

					// Game state will be updated, which will trigger another run of this effect
				} catch (error) {
					console.error('[GAME-PAGE] Failed to load game from URL:', gameIdFromUrl, error);
					setLoadError(`Failed to load game: ${error instanceof Error ? error.message : 'Unknown error'}`);
					// Don't redirect immediately - let user see the error
				} finally {
					setIsLoadingGameData(false);
				}
			}
		};

		handleGameFromUrl();
	}, [gameIdFromUrl, auth.isLoading, auth.isAuthenticated, auth.isTokenExpired, gameState.gameId, gameState.isInitialized, navigate]);

	// Show loading state while auth is loading or while loading game from URL
	if (auth.isLoading || isLoadingGameData ||
		(gameIdFromUrl && gameState.gameId !== gameIdFromUrl && auth.isAuthenticated && !auth.isTokenExpired)) {
		return (
			<Container fluid style={{ padding: 0, background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ color: 'white', fontSize: '24px' }}>
					{auth.isLoading
						? 'Checking authentication...'
						: isLoadingGameData
							? 'Loading game...'
							: 'Initializing game...'}
				</div>
			</Container>
		);
	}

	// Show error state if game loading failed
	if (loadError) {
		return (
			<Container fluid style={{ padding: 0, background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ color: '#ff6b6b', fontSize: '18px', textAlign: 'center' }}>
					<h3>Failed to Load Game</h3>
					<p>{loadError}</p>
					<Button variant="primary" onClick={() => navigate('/')}>
						Back to Menu
					</Button>
				</div>
			</Container>
		);
	}

	// Only render GameRenderer when we have a valid game ID and the game state is loaded
	if (!gameIdFromUrl || !gameState.isInitialized || gameState.gameId !== gameIdFromUrl) {
		return (
			<Container fluid style={{ padding: 0, background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ color: 'white', fontSize: '24px' }}>
					Preparing game...
				</div>
			</Container>
		);
	}

	return (
		<GameRenderer gameId={gameIdFromUrl} savedGameData={savedGameData} />
	);
};
