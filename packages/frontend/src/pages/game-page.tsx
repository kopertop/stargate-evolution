import { Ticker } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { InputDevice } from 'pixijs-input-devices';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Container, Modal, Form, Row, Col, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router';

import { Game } from '../game';

// Game page removed - focusing on Admin functionality only
// If game functionality is needed later, it should use direct API calls instead of LiveStore

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
	up: [12], // D-pad up
	down: [13], // D-pad down
	left: [14], // D-pad left
	right: [15], // D-pad right
	pause: [9, 8], // Start (+) and Select (-) buttons
	back: [0], // B button (button 0)
	activate: [1], // A button (button 1)
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
	const [gamepadState, setGamepadState] = useState<any>(null);
	const [focusedMenuItem, setFocusedMenuItem] = useState(0); // Track focused menu item
	
	// Use refs to avoid stale closure issues in gamepad polling
	const showPauseRef = useRef(showPause);
	const showSettingsRef = useRef(showSettings);
	const showDebugRef = useRef(showDebug);
	const focusedMenuItemRef = useRef(focusedMenuItem);
	
	// Keep refs in sync with state
	useEffect(() => { showPauseRef.current = showPause; }, [showPause]);
	useEffect(() => { showSettingsRef.current = showSettings; }, [showSettings]);
	useEffect(() => { showDebugRef.current = showDebug; }, [showDebug]);
	useEffect(() => { focusedMenuItemRef.current = focusedMenuItem; }, [focusedMenuItem]);

	// Fullscreen on mount
	useEffect(() => {
		const goFullscreen = () => {
			const el = canvasRef.current;
			if (el && document.fullscreenElement == null) {
				if (el.requestFullscreen) el.requestFullscreen();
				else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
			}
		};
		setTimeout(goFullscreen, 0);
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
			const game = new Game(app, { speed, keybindings, gamepadBindings });
			gameRef.current = game;
		})();

		// Initialize and configure InputDevice for gamepad support
		console.log('[DEBUG] Initializing InputDevice...');
		
		// Add gamepad connection event listeners for debugging
		const handleGamepadConnected = (e: GamepadEvent) => {
			console.log('[DEBUG] Gamepad connected:', e.gamepad.id, 'at index', e.gamepad.index);
			console.log('[DEBUG] Updated InputDevice gamepads count:', InputDevice.gamepads.length);
		};
		
		const handleGamepadDisconnected = (e: GamepadEvent) => {
			console.log('[DEBUG] Gamepad disconnected:', e.gamepad.id, 'at index', e.gamepad.index);
			console.log('[DEBUG] Updated InputDevice gamepads count:', InputDevice.gamepads.length);
		};
		
		window.addEventListener('gamepadconnected', handleGamepadConnected);
		window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
		
		try {
			// Initialize InputDevice (no init method needed)
			console.log('[DEBUG] InputDevice available');
			
			// Add InputDevice.update to the ticker
			Ticker.shared.add(InputDevice.update);
			console.log('[DEBUG] InputDevice update added to ticker');
			
			// Log initial gamepad state
			console.log('[DEBUG] Initial gamepads detected:', InputDevice.gamepads.length);
			InputDevice.gamepads.forEach((gamepad, index) => {
				console.log(`[DEBUG] Gamepad ${index}:`, {
					id: gamepad.id,
					buttonsCount: Object.keys(gamepad.button).length,
					hasLeftJoystick: !!gamepad.leftJoystick,
					hasRightJoystick: !!gamepad.rightJoystick
				});
			});
			
		} catch (error) {
			console.error('[DEBUG] Error initializing InputDevice:', error);
		}

		return () => {
			destroyed = true;
			if (pixiAppRef.current) {
				pixiAppRef.current.destroy(true);
				pixiAppRef.current = null;
			}
			Ticker.shared.remove(InputDevice.update);
			
			// Cleanup gamepad event listeners
			window.removeEventListener('gamepadconnected', handleGamepadConnected);
			window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
			
			console.log('[DEBUG] InputDevice cleanup completed');
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [speed, keybindings, gamepadBindings]);

	// Gamepad menu controls
	useEffect(() => {
		let lastGamepadState: { [key: number]: boolean } = {};
		let animationFrameId: number;
		
		const pollGamepadInput = () => {
			const gp = navigator.getGamepads()[0]; // Use first connected gamepad
			if (gp) {
				// Check pause buttons (Start/+ and Select/-)
				const pausePressed = gamepadBindings.pause.some(buttonIndex => gp.buttons[buttonIndex]?.pressed);
				const backPressed = gamepadBindings.back.some(buttonIndex => gp.buttons[buttonIndex]?.pressed);
				const activatePressed = gamepadBindings.activate.some(buttonIndex => gp.buttons[buttonIndex]?.pressed);
				
				// Check d-pad for menu navigation
				const upPressed = gamepadBindings.up.some(buttonIndex => gp.buttons[buttonIndex]?.pressed);
				const downPressed = gamepadBindings.down.some(buttonIndex => gp.buttons[buttonIndex]?.pressed);
				
				// Handle pause button (only on button release, not press or hold)
				if (!pausePressed && gamepadBindings.pause.some(buttonIndex => lastGamepadState[buttonIndex])) {
					console.log('[DEBUG] Gamepad pause button released');
					console.log('[DEBUG] Current showPause state:', showPauseRef.current);
					setShowPause((prev) => {
						console.log('[DEBUG] Toggling pause from', prev, 'to', !prev);
						return !prev;
					});
					setFocusedMenuItem(0); // Reset to first menu item when opening
				}
				
				// Handle d-pad navigation in menus (only when a menu is open, on button release)
				if (showPauseRef.current || showSettingsRef.current || showDebugRef.current) {
					const menuItemCount = showPauseRef.current ? 5 : (showSettingsRef.current ? 1 : 1); // Pause has 5 items, others have different counts
					
					if (!upPressed && gamepadBindings.up.some(buttonIndex => lastGamepadState[buttonIndex])) {
						console.log('[DEBUG] Gamepad up navigation (released)');
						setFocusedMenuItem((prev) => (prev > 0 ? prev - 1 : menuItemCount - 1));
					}
					
					if (!downPressed && gamepadBindings.down.some(buttonIndex => lastGamepadState[buttonIndex])) {
						console.log('[DEBUG] Gamepad down navigation (released)');
						setFocusedMenuItem((prev) => (prev < menuItemCount - 1 ? prev + 1 : 0));
					}
				}
				
				// Handle back button (only on button release, not press or hold)
				if (!backPressed && gamepadBindings.back.some(buttonIndex => lastGamepadState[buttonIndex])) {
					console.log('[DEBUG] Gamepad back button released');
					if (showPauseRef.current || showSettingsRef.current || showDebugRef.current) {
						setShowPause(false);
						setShowSettings(false);
						setShowDebug(false);
					}
				}
				
				// Handle activate button (only on button release, not press or hold)
				if (!activatePressed && gamepadBindings.activate.some(buttonIndex => lastGamepadState[buttonIndex])) {
					console.log('[DEBUG] Gamepad activate button released');
					console.log('[DEBUG] Current menu state - pause:', showPauseRef.current, 'settings:', showSettingsRef.current, 'debug:', showDebugRef.current);
					console.log('[DEBUG] Focused menu item:', focusedMenuItemRef.current);
					
					// Handle activation based on which menu is open and which item is focused
					if (showPauseRef.current) {
						console.log('[DEBUG] Activating pause menu item:', focusedMenuItemRef.current);
						switch (focusedMenuItemRef.current) {
							case 0: // Resume
								console.log('[DEBUG] Resuming game');
								setShowPause(false);
								break;
							case 1: // Main Menu
								console.log('[DEBUG] Navigating to main menu');
								navigate('/');
								break;
							case 2: // Save Game (disabled)
								console.log('[DEBUG] Save game button is disabled');
								// Do nothing - button is disabled
								break;
							case 3: // Settings
								console.log('[DEBUG] Opening settings menu');
								setShowSettings(true);
								setShowPause(false);
								setFocusedMenuItem(0);
								break;
							case 4: // Debug
								console.log('[DEBUG] Opening debug menu');
								setShowDebug(true);
								setShowPause(false);
								setFocusedMenuItem(0);
								break;
						}
					} else if (showSettingsRef.current) {
						console.log('[DEBUG] Closing settings menu');
						setShowSettings(false);
					} else if (showDebugRef.current) {
						console.log('[DEBUG] Closing debug menu');
						setShowDebug(false);
					}
				}
				
				// Update last state for next frame
				lastGamepadState = {};
				gp.buttons.forEach((button, index) => {
					lastGamepadState[index] = button.pressed;
				});
			}
			
			animationFrameId = requestAnimationFrame(pollGamepadInput);
		};
		
		pollGamepadInput();
		
		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, [gamepadBindings, navigate]);

	// Update game menu state when any menu opens/closes
	useEffect(() => {
		if (gameRef.current) {
			const menuOpen = showPause || showSettings || showDebug;
			gameRef.current.setMenuOpen(menuOpen);
			console.log('[DEBUG] Game menu state updated:', menuOpen);
		}
	}, [showPause, showSettings, showDebug]);

	// Escape key for pause menu
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

	// Poll gamepad state for debug using pixijs-input-devices
	useEffect(() => {
		if (!showDebug) return;
		
		console.log('[DEBUG] Starting gamepad debug polling...');
		console.log('[DEBUG] Available gamepads:', InputDevice.gamepads.length);
		
		// Also check native gamepad API for comparison
		const nativeGamepads = navigator.getGamepads();
		console.log('[DEBUG] Native gamepads:', nativeGamepads.length, Array.from(nativeGamepads).filter(Boolean).length, 'connected');
		
		let raf: number;
		let pollCount = 0;
		
		const poll = () => {
			try {
				const gamepadData = InputDevice.gamepads.map(gp => ({
					id: gp.id,
					buttons: Object.entries(gp.button).map(([name, btn]: [string, any]) => ({ name, pressed: !!btn })),
					leftJoystick: gp.leftJoystick,
					rightJoystick: gp.rightJoystick,
				}));
				
				// Log every 60 polls (roughly once per second at 60fps)
				if (pollCount % 60 === 0) {
					console.log(`[DEBUG] Poll ${pollCount}: InputDevice gamepads:`, gamepadData.length);
					const nativeCount = Array.from(navigator.getGamepads()).filter(Boolean).length;
					console.log(`[DEBUG] Poll ${pollCount}: Native gamepads:`, nativeCount);
					
					if (gamepadData.length !== nativeCount) {
						console.warn(`[DEBUG] Mismatch: InputDevice (${gamepadData.length}) vs Native (${nativeCount})`);
					}
				}
				
				setGamepadState(gamepadData);
				pollCount++;
				raf = requestAnimationFrame(poll);
			} catch (error) {
				console.error('[DEBUG] Error in gamepad polling:', error);
				raf = requestAnimationFrame(poll);
			}
		};
		
		poll();
		return () => {
			console.log('[DEBUG] Stopping gamepad debug polling after', pollCount, 'polls');
			cancelAnimationFrame(raf);
		};
	}, [showDebug]);

	return (
		<Container fluid style={{ padding: 0, background: '#000', minHeight: '100vh', position: 'relative' }}>
			<div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
				<Button variant="secondary" onClick={() => navigate('/')}>Back to Menu</Button>
			</div>
			<div ref={canvasRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />

			<Modal show={showPause} centered backdrop="static" keyboard={false}>
				<Modal.Header>
					<Modal.Title>Paused</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className="d-grid gap-2">
						<Button 
							variant={focusedMenuItem === 0 ? "primary" : "outline-primary"} 
							size="lg" 
							onClick={() => setShowPause(false)}
							style={focusedMenuItem === 0 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
							Resume
						</Button>
						<Button 
							variant={focusedMenuItem === 1 ? "primary" : "secondary"} 
							size="lg" 
							onClick={() => navigate('/')}
							style={focusedMenuItem === 1 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
							Main Menu
						</Button>
						<Button 
							variant={focusedMenuItem === 2 ? "primary" : "outline-secondary"} 
							size="lg" 
							disabled 
							title="TODO: Save game coming soon"
							style={focusedMenuItem === 2 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
							Save Game (TODO)
						</Button>
						<Button 
							variant={focusedMenuItem === 3 ? "primary" : "outline-secondary"} 
							size="lg" 
							onClick={() => { setShowSettings(true); setShowPause(false); setFocusedMenuItem(0); }}
							style={focusedMenuItem === 3 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
						>
							Settings
						</Button>
						<Button 
							variant={focusedMenuItem === 4 ? "primary" : "outline-secondary"} 
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
									setGamepadState([...currentState]);
								}}
							>
								Refresh Gamepad Detection
							</Button>
						</div>
					</div>
					
					{gamepadState && gamepadState.length === 0 && (
						<div style={{ color: 'orange', fontWeight: 'bold' }}>
							No gamepads detected by InputDevice.
							<br/><small>Try connecting a gamepad and pressing any button, then refresh this debug panel.</small>
						</div>
					)}
					{gamepadState && gamepadState.map((pad: any, idx: number) => (
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
