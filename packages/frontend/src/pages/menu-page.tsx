import type { Session, SavedGameListItem } from '@stargate/common';
import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Container, Row, Col, Modal, Form, Table, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { FaTools, FaSignInAlt, FaSignOutAlt, FaGamepad, FaTrash, FaCopy, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';


import { renderGoogleSignInButton, initializePWAAuthHandling } from '../auth/google-auth';
import { VersionInfo } from '../components/version-info';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/auth-context';
import { useGameState } from '../contexts/game-state-context';
import { useGameController } from '../services/game-controller';
import { SavedGameService } from '../services/saved-game-service';
import { isMobileDevice, debugPWADetection } from '../utils/mobile-utils';

import './google-login.css';

export const MenuPage: React.FC = () => {
	const navigate = useNavigate();
	const { user, session, isLoading: loading, isTokenExpired, signIn, signOut, reAuthenticate } = useAuth();

	// Debug PWA detection and initialize PWA auth handling on component mount
	useEffect(() => {
		debugPWADetection();
		initializePWAAuthHandling();
	}, []);
	const [focusedMenuItem, setFocusedMenuItem] = useState(0);
	const [showNewGameModal, setShowNewGameModal] = useState(false);
	const [newGameName, setNewGameName] = useState('');
	const [showLoadGameModal, setShowLoadGameModal] = useState(false);
	const [savedGames, setSavedGames] = useState<SavedGameListItem[]>([]);
	const [loadingGames, setLoadingGames] = useState(false);
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	const [checkingSavedGames, setCheckingSavedGames] = useState(false);
	const [mostRecentGame, setMostRecentGame] = useState<SavedGameListItem | null>(null);
	const [showReAuthModal, setShowReAuthModal] = useState(false);
	const [showJwtToken, setShowJwtToken] = useState(false);
	const [showMCPCommand, setShowMCPCommand] = useState(false);
	const [showJwtModal, setShowJwtModal] = useState(false);
	const [showApiKey, setShowApiKey] = useState(false);
	const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
	const controller = useGameController();
	const gameState = useGameState();

	// Check for saved games when user changes
	useEffect(() => {
		if (user) {
			checkForSavedGames();
		} else {
			setMostRecentGame(null);
		}
	}, [user]);

	// Use refs to avoid stale closure issues
	const stateRef = useRef({ user, focusedMenuItem });

	// Update refs when state changes
	useEffect(() => {
		stateRef.current = { user, focusedMenuItem };
	}, [user, focusedMenuItem]);

	// Gamepad navigation
	useEffect(() => {
		if (!controller.isConnected) return;

		console.log('[MENU-PAGE-CONTROLLER] Setting up gamepad navigation');

		// Get menu item count based on auth state and device
		const getMenuItemCount = (currentUser: any) => {
			if (!currentUser) return 2; // Start New Game (No Save) + Sign In button
			let count = 3; // Start Game + Continue + Load Game
			if (currentUser.is_admin && !isMobileDevice()) count++; // Admin Panel (only on desktop)
			count++; // Sign Out
			return count;
		};

		// Menu navigation (D-pad up/down)
		const unsubscribeUpNav = controller.onButtonRelease('DPAD_UP', () => {
			console.log('[MENU-PAGE-CONTROLLER] D-pad UP - menu navigation');
			const state = stateRef.current;
			const menuCount = getMenuItemCount(state.user);
			setFocusedMenuItem(prev => (prev > 0 ? prev - 1 : menuCount - 1));
		});

		const unsubscribeDownNav = controller.onButtonRelease('DPAD_DOWN', () => {
			console.log('[MENU-PAGE-CONTROLLER] D-pad DOWN - menu navigation');
			const state = stateRef.current;
			const menuCount = getMenuItemCount(state.user);
			setFocusedMenuItem(prev => (prev < menuCount - 1 ? prev + 1 : 0));
		});

		// Menu activation (A button)
		const unsubscribeActivate = controller.onButtonRelease('A', () => {
			const state = stateRef.current;
			console.log('[MENU-PAGE-CONTROLLER] A button - activating menu item:', state.focusedMenuItem);

			if (!state.user) {
				// Not signed in - Start New Game (No Save) + Google sign in available
				if (state.focusedMenuItem === 0) {
					// Start New Game (No Save)
					handleNewGame();
				} else if (state.focusedMenuItem === 1) {
					// Trigger Google sign in (simulate clicking the button)
					const googleButton = document.querySelector('#google-signin-button button') as HTMLButtonElement;
					if (googleButton) {
						googleButton.click();
					}
				}
				return;
			}

			// Signed in menu
			const itemIndex = state.focusedMenuItem;

			if (itemIndex === 0) {
				// Start New Game
				handleNewGame();
			} else if (itemIndex === 1) {
				// Continue Game
				handleContinueGame();
			} else if (itemIndex === 2) {
				// Load Game
				handleLoadGame();
			} else if (state.user.is_admin && !isMobileDevice() && itemIndex === 3) {
				// Admin Panel (only if admin and not mobile)
				handleAdminAccess();
			} else if (itemIndex === (state.user.is_admin && !isMobileDevice() ? 4 : 3)) {
				// Sign Out (last item, accounting for admin button visibility)
				handleSignOut();
			}
		});

		return () => {
			console.log('[MENU-PAGE-CONTROLLER] Cleaning up gamepad navigation');
			unsubscribeUpNav();
			unsubscribeDownNav();
			unsubscribeActivate();
		};
	}, [controller.isConnected]);



	const checkForSavedGames = async () => {
		if (!user || isTokenExpired) return;

		setCheckingSavedGames(true);
		try {
			const games = await SavedGameService.listSavedGames();
			// Ensure games is an array and has length property
			if (games && Array.isArray(games) && games.length > 0) {
				// Find the most recently updated game
				const mostRecent = games.reduce((latest, current) =>
					current.updated_at > latest.updated_at ? current : latest,
				);
				setMostRecentGame(mostRecent);
				console.log('[MENU] Found most recent game:', mostRecent.name, 'updated:', new Date(mostRecent.updated_at * 1000));
			} else {
				setMostRecentGame(null);
				console.log('[MENU] No saved games found');
			}
		} catch (error) {
			console.error('Failed to check for saved games:', error);
			setMostRecentGame(null);
		} finally {
			setCheckingSavedGames(false);
		}
	};

	const handleGoogleSignIn = async (idToken: string) => {
		try {
			await signIn(idToken);
		} catch (error) {
			// Error handling is done in the auth context
		}
	};

	const handleSignOut = () => {
		signOut();
	};

	const handleCopyJwtToken = async () => {
		if (!session?.token) {
			toast.error('No JWT token available');
			return;
		}

		try {
			await navigator.clipboard.writeText(session.token);
			toast.success('JWT token copied to clipboard');
		} catch (error) {
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement('textarea');
			textArea.value = session.token;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			toast.success('JWT token copied to clipboard');
		}
	};

	const handleCopyMCPCommand = async () => {
		if (!session?.token) {
			toast.error('No JWT token available');
			return;
		}

		const mcpCommand = `claude mcp add --transport http stargate-evolution ${API_BASE_URL}/api/mcp --header "Authorization: Bearer ${session.token}"`;

		try {
			await navigator.clipboard.writeText(mcpCommand);
			toast.success('MCP command copied to clipboard');
		} catch (error) {
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement('textarea');
			textArea.value = mcpCommand;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			toast.success('MCP command copied to clipboard');
		}
	};

	const handleCopyApiKey = async () => {
		if (!user?.api_key) {
			toast.error('No API key available');
			return;
		}

		try {
			await navigator.clipboard.writeText(user.api_key);
			toast.success('API key copied to clipboard');
		} catch (error) {
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement('textarea');
			textArea.value = user.api_key;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			toast.success('API key copied to clipboard');
		}
	};

	const handleCopyMCPCommandWithApiKey = async () => {
		if (!user?.api_key) {
			toast.error('No API key available');
			return;
		}

		const mcpCommand = `claude mcp add --transport http stargate-evolution ${API_BASE_URL}/api/mcp --header "Authorization: Bearer ${user.api_key}"`;

		try {
			await navigator.clipboard.writeText(mcpCommand);
			toast.success('MCP command with API key copied to clipboard');
		} catch (error) {
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement('textarea');
			textArea.value = mcpCommand;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			toast.success('MCP command with API key copied to clipboard');
		}
	};

	const handleGenerateApiKey = async () => {
		if (!session?.token) {
			toast.error('Please sign in to generate an API key');
			return;
		}

		setIsGeneratingApiKey(true);
		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/generate-api-key`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${session.token}`,
					'Content-Type': 'application/json',
				},
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to generate API key');
			}

			// Update local user state with new API key without re-authentication
			if (user) {
				// Manually update the user context by triggering a token validation
				// This avoids the Google JWT re-authentication issue
				try {
					const validateResponse = await fetch(`${API_BASE_URL}/api/auth/validate`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ token: session.token }),
					});

					if (validateResponse.ok) {
						const validateData = await validateResponse.json();
						if (validateData.valid && validateData.user) {
							// The user state will be updated through the auth context
							console.log('User state refreshed with new API key');
						}
					}
				} catch (validateError) {
					console.log('Token validation failed, but API key was generated:', validateError);
				}
			}

			toast.success('API key generated successfully');

			// Force a page refresh to update the user state
			window.location.reload();
		} catch (error) {
			console.error('Failed to generate API key:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to generate API key');
		} finally {
			setIsGeneratingApiKey(false);
		}
	};

	const handleDeleteApiKey = async () => {
		if (!session?.token) {
			toast.error('Please sign in to delete your API key');
			return;
		}

		if (!confirm('Are you sure you want to delete your API key? This will revoke access for any MCP integrations using this key.')) {
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/api-key`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${session.token}`,
					'Content-Type': 'application/json',
				},
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to delete API key');
			}

			toast.success('API key deleted successfully');

			// Force a page refresh to update the user state
			window.location.reload();
		} catch (error) {
			console.error('Failed to delete API key:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
		}
	};

	const handleReAuthenticate = async (idToken: string) => {
		try {
			await reAuthenticate(idToken);
			setShowReAuthModal(false);
		} catch (error) {
			// Error handling is done in the auth context
		}
	};

	const handleAdminAccess = () => {
		if (!user) {
			toast.error('Please sign in first');
			return;
		}
		if (!user.is_admin) {
			toast.error('Admin access required');
			return;
		}
		if (isMobileDevice()) {
			toast.error('Admin panel is not available on mobile devices');
			return;
		}
		navigate('/admin');
	};

	const handleNewGame = async () => {
		if (!user) {
			// Guest: start immediately in local-only mode without prompting for name
			const newGameId = await gameState.initializeNewGame();
			navigate(`/game/${newGameId}`);
			return;
		}
		// Authenticated users choose a name
		setNewGameName('');
		setShowNewGameModal(true);
	};

	const handleCreateNewGame = async () => {
		// Only require name when signed in
		if (user && !newGameName.trim()) {
			toast.error('Please enter a game name');
			return;
		}

		try {
			console.log('[MENU] Starting game creation...');
			// Guests call initializeNewGame() without a name; authenticated users pass trimmed name
			const newGameId = await gameState.initializeNewGame(user ? newGameName.trim() : undefined);
			console.log('[MENU] Game created successfully with ID:', newGameId);
			console.log('[MENU] Game ID starts with "local-":', newGameId.startsWith('local-'));
			setShowNewGameModal(false);
			// Refresh saved games list since we just created a new one
			if (user) checkForSavedGames();
			console.log('[MENU] Navigating to game:', `/game/${newGameId}`);
			navigate(`/game/${newGameId}`);
			console.log('[MENU] Navigation completed');
		} catch (error) {
			console.error('[MENU] Game creation failed:', error);
			// Error already handled in gameState.initializeNewGame
		}
	};

	const handleContinueGame = async () => {
		if (!mostRecentGame) {
			toast.info('No saved games found. Create a new game to get started!');
			return;
		}

		if (isTokenExpired) {
			toast.warning('Please sign in to continue your saved game');
			setShowReAuthModal(true);
			return;
		}

		try {
			setCheckingSavedGames(true);
			console.log('[MENU] Loading most recent game:', mostRecentGame.name);
			await gameState.loadGame(mostRecentGame.id);
			navigate(`/game/${mostRecentGame.id}`);
		} catch (error) {
			console.error('Failed to load most recent game:', error);
			toast.error('Failed to load game');
		} finally {
			setCheckingSavedGames(false);
		}
	};

	const handleLoadGame = async () => {
		setShowLoadGameModal(true);
		setLoadingGames(true);
		setSelectedGameId(null);

		if (!user || isTokenExpired) {
			toast.warning('Please sign in to load saved games');
			setSavedGames([]);
			setLoadingGames(false);
			return;
		}

		try {
			const games = await SavedGameService.listSavedGames();
			// Ensure games is an array before setting it
			setSavedGames(games && Array.isArray(games) ? games : []);
		} catch (error) {
			console.error('Failed to load saved games:', error);
			toast.error('Failed to load saved games');
			// Set empty array on error to prevent undefined issues
			setSavedGames([]);
		} finally {
			setLoadingGames(false);
		}
	};

	const handleSelectGame = (gameId: string) => {
		setSelectedGameId(gameId);
	};

	const handleLoadSelectedGame = async () => {
		if (!selectedGameId) {
			toast.error('Please select a game to load');
			return;
		}

		try {
			setLoadingGames(true);
			await gameState.loadGame(selectedGameId);
			setShowLoadGameModal(false);
			// Refresh the most recent game since we just loaded one (it becomes the most recent)
			checkForSavedGames();
			navigate(`/game/${selectedGameId}`);
		} catch (error) {
			console.error('Failed to load game:', error);
			toast.error('Failed to load game');
		} finally {
			setLoadingGames(false);
		}
	};

	const handleDeleteGame = async (gameId: string, gameName: string) => {
		if (!confirm(`Are you sure you want to delete "${gameName}"? This action cannot be undone.`)) {
			return;
		}

		try {
			await SavedGameService.deleteSavedGame(gameId);
			toast.success(`"${gameName}" deleted successfully`);
			// Refresh the list
			const games = await SavedGameService.listSavedGames();
			setSavedGames(games && Array.isArray(games) ? games : []);
			// Clear selection if the deleted game was selected
			if (selectedGameId === gameId) {
				setSelectedGameId(null);
			}
			// Refresh the most recent game for the Continue button
			checkForSavedGames();
		} catch (error) {
			console.error('Failed to delete game:', error);
			toast.error('Failed to delete game');
		}
	};

	// Initialize Google Sign-In button once when user state changes
	useEffect(() => {
		if (!user && !loading) {
			// Only render Google button when user is not logged in and not loading
			const timer = setTimeout(() => {
				const container = document.getElementById('google-signin-button');
				if (container) {
					container.innerHTML = ''; // Clear any existing content
					renderGoogleSignInButton({
						containerId: 'google-signin-button',
						onSuccess: handleGoogleSignIn,
						onError: (error) => {
							console.error('[MENU] Google Sign-In error:', error);
							toast.error(`Sign-in failed: ${error}`);
						},
						maxRetries: 3,
						retryDelay: 2000,
					});
				}
			}, 100); // Small delay to ensure DOM is ready

			return () => clearTimeout(timer);
		}
	}, [user, loading]); // Only re-run when user or loading state changes

	// Set up Google Sign-In button for re-authentication modal
	useEffect(() => {
		if (showReAuthModal) {
			const timer = setTimeout(() => {
				const container = document.getElementById('menu-reauth-google-signin-button');
				if (container) {
					container.innerHTML = ''; // Clear any existing content
					renderGoogleSignInButton({
						containerId: 'menu-reauth-google-signin-button',
						onSuccess: handleReAuthenticate,
						onError: (error) => {
							console.error('[MENU] Re-auth Google Sign-In error:', error);
							toast.error(`Re-authentication failed: ${error}`);
						},
						maxRetries: 2,
						retryDelay: 1500,
					});
				}
			}, 100); // Small delay to ensure DOM is ready

			return () => clearTimeout(timer);
		}
	}, [showReAuthModal]);

	if (loading) {
		return (
			<div className="d-flex justify-content-center align-items-center bg-dark text-light" style={{ minHeight: '100vh' }}>
				<div className="text-center">
					<div className="spinner-border text-primary" role="status">
						<span className="visually-hidden">Loading...</span>
					</div>
					<p className="mt-2">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-dark text-light" style={{ minHeight: '100vh' }}>
			<Container className="py-5">
				<Row className="justify-content-center">
					<Col md={8} lg={6}>
						<div className="text-center mb-5">
							<h1 className="display-4 mb-3">Stargate Evolution</h1>
						</div>

						{user ? (
							<Card bg="dark" text="light" border="primary">
								<Card.Body>
									<div className="d-flex align-items-center mb-4">
										{user.picture && (
											<img
												src={user.picture}
												alt={user.name}
												className="rounded-circle me-3"
												width="50"
												height="50"
											/>
										)}
										<div>
											<h5 className="mb-0">{user.name}</h5>
											<small className="text-muted">{user.email}</small>
											{user.is_admin && (
												<div className="d-flex align-items-center flex-wrap">
													<span className="badge bg-success ms-2">Admin</span>
													<Button
														variant="link"
														size="sm"
														className="p-0 ms-2 text-info"
														onClick={() => setShowJwtModal(true)}
														title="View MCP Authentication Options"
													>
														<FaEye size={12} /> MCP Auth
													</Button>
												</div>
											)}
											{isTokenExpired && (
												<div>
													<span className="badge bg-warning text-dark ms-2">Session Expired</span>
												</div>
											)}
										</div>
									</div>

									{isTokenExpired && (
										<div className="alert alert-warning d-flex justify-content-between align-items-center mb-3">
											<span>Your session has expired. Sign in again to save/load games.</span>
											<Button
												variant="warning"
												size="sm"
												onClick={() => setShowReAuthModal(true)}
											>
												Sign In
											</Button>
										</div>
									)}

									<div className="d-grid gap-2 mb-3">
										<Button
											variant={focusedMenuItem === 0 ? 'success' : 'outline-success'}
											size="lg"
											onClick={handleNewGame}
											style={focusedMenuItem === 0 ? { boxShadow: '0 0 10px rgba(25, 135, 84, 0.8)' } : {}}
										>
											Start New Game
										</Button>
										<Button
											variant={focusedMenuItem === 1 ? 'secondary' : 'outline-secondary'}
											size="lg"
											onClick={handleContinueGame}
											disabled={!mostRecentGame || checkingSavedGames}
											title={mostRecentGame ? `Continue "${mostRecentGame.name}"` : 'No saved games found'}
											style={focusedMenuItem === 1 ? { boxShadow: '0 0 10px rgba(108, 117, 125, 0.8)' } : {}}
										>
											{checkingSavedGames ? (
												<>
													<Spinner animation="border" size="sm" className="me-2" />
													Checking...
												</>
											) : mostRecentGame ? (
												`Continue "${mostRecentGame.name}"`
											) : (
												'No Saved Games'
											)}
										</Button>
										<Button
											variant={focusedMenuItem === 2 ? 'info' : 'outline-info'}
											size="lg"
											onClick={handleLoadGame}
											style={focusedMenuItem === 2 ? { boxShadow: '0 0 10px rgba(13, 202, 240, 0.8)' } : {}}
										>
											<FaGamepad className="me-2" />
											Load Game
										</Button>
									</div>

									<div className="d-grid gap-2">
										{user.is_admin && !isMobileDevice() ? (
											<Button
												variant={focusedMenuItem === 3 ? 'primary' : 'outline-primary'}
												size="lg"
												onClick={handleAdminAccess}
												style={focusedMenuItem === 3 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
											>
												<FaTools className="me-2" />
												Admin Panel
											</Button>
										) : !user.is_admin && !isMobileDevice() ? (
											<div className="text-center text-muted">
												<p>Admin access required for this application.</p>
												<p>Please contact an administrator for access.</p>
											</div>
										) : null}

										<Button
											variant={focusedMenuItem === (user.is_admin && !isMobileDevice() ? 4 : 3) ? 'secondary' : 'outline-secondary'}
											onClick={handleSignOut}
											style={focusedMenuItem === (user.is_admin && !isMobileDevice() ? 4 : 3) ? { boxShadow: '0 0 10px rgba(108, 117, 125, 0.8)' } : {}}
										>
											<FaSignOutAlt className="me-2" />
											Sign Out
										</Button>
									</div>

									{controller.isConnected && (
										<div className="text-center mt-3">
											<small className="text-muted">Use D-pad to navigate • A to select</small>
										</div>
									)}
								</Card.Body>
							</Card>
						) : (
							<Card bg="dark" text="light" border="secondary">
								<Card.Body>
									<h5 className="card-title text-center mb-4">Stargate Evolution</h5>
									<p className="text-center text-muted mb-3">
										Sign in to save and restore your progress, or play without saving.
									</p>

									<div className="d-grid gap-2 mb-3">
										<Button
											variant={focusedMenuItem === 0 ? 'success' : 'outline-success'}
											size="lg"
											onClick={handleNewGame}
											style={focusedMenuItem === 0 ? { boxShadow: '0 0 10px rgba(25, 135, 84, 0.8)' } : {}}
										>
											Start New Game
										</Button>
									</div>

									<div className="alert alert-info mb-3">
										<small>
											<strong>Note:</strong> Without signing in, your progress won&apos;t be saved.
											You can play and test the game, but you&apos;ll lose progress when you close the browser.
										</small>
									</div>

									<div
										className="d-grid"
										style={focusedMenuItem === 1 ? {
											border: '2px solid #007bff',
											borderRadius: '5px',
											padding: '8px',
											boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)',
										} : {}}
									>
										<div id="google-signin-button" className="d-flex justify-content-center" />
									</div>
									<div className="text-center mt-2">
										<small className="text-muted">Sign in to save progress and access saved games</small>
									</div>

									{controller.isConnected && (
										<div className="text-center mt-3">
											<small className="text-muted">Use D-pad to navigate • A to select</small>
										</div>
									)}
								</Card.Body>
							</Card>
						)}
					</Col>
				</Row>
			</Container>

			{/* Version Information */}
			<div className="position-fixed bottom-0 start-0 p-3">
				<VersionInfo />
			</div>

			{/* New Game Modal */}
			<Modal show={showNewGameModal} onHide={() => setShowNewGameModal(false)} centered>
				<Modal.Header closeButton>
					<Modal.Title>Create New Game</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{!user && (
						<Alert variant="warning" className="mb-3">
							<strong>Playing without sign-in:</strong> Your progress will be saved locally only.
							If you clear your browser data or switch devices, you&apos;ll lose your progress.
						</Alert>
					)}
					<Form>
						<Form.Group className="mb-3">
							<Form.Label>Game Name</Form.Label>
							<Form.Control
								type="text"
								placeholder="Enter a name for your new game..."
								value={newGameName}
								onChange={(e) => setNewGameName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										handleCreateNewGame();
									}
								}}
								autoFocus
								maxLength={100}
							/>
							<Form.Text className="text-muted">
								{user
									? 'Optional; helps you identify your save game later.'
									: 'Optional; game will be saved locally only.'
								}
							</Form.Text>
						</Form.Group>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowNewGameModal(false)}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={handleCreateNewGame}
						disabled={gameState.isLoading}
					>
						{gameState.isLoading ? 'Creating...' : (user ? 'Create Game' : 'Create Game (Local Only)')}
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Load Game Modal */}
			<Modal show={showLoadGameModal} onHide={() => setShowLoadGameModal(false)} centered size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Load Saved Game</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{loadingGames ? (
						<div className="text-center py-4">
							<Spinner animation="border" variant="primary" />
							<p className="mt-2">Loading saved games...</p>
						</div>
					) : !savedGames || savedGames.length === 0 ? (
						<div className="text-center py-4">
							<p className="text-muted">No saved games found.</p>
							<p className="text-muted">Create a new game to get started!</p>
						</div>
					) : (
						<>
							<p className="text-muted mb-3">Select a game to load:</p>
							<Table striped bordered hover>
								<thead>
									<tr>
										<th>Select</th>
										<th>Game Name</th>
										<th>Created</th>
										<th>Last Played</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{savedGames && savedGames.map((game) => (
										<tr
											key={game.id}
											className={selectedGameId === game.id ? 'table-primary' : ''}
											style={{ cursor: 'pointer' }}
											onClick={() => handleSelectGame(game.id)}
										>
											<td>
												<Form.Check
													type="radio"
													name="selectedGame"
													checked={selectedGameId === game.id}
													onChange={() => handleSelectGame(game.id)}
												/>
											</td>
											<td>
												<strong>{game.name}</strong>
												{game.description && (
													<><br /><small className="text-muted">{game.description}</small></>
												)}
											</td>
											<td>
												<small>{new Date(game.created_at * 1000).toLocaleDateString()}</small>
											</td>
											<td>
												<small>{new Date(game.updated_at * 1000).toLocaleDateString()}</small>
											</td>
											<td>
												<Button
													variant="outline-danger"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteGame(game.id, game.name);
													}}
													title="Delete this saved game"
												>
													<FaTrash />
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</Table>
						</>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowLoadGameModal(false)}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={handleLoadSelectedGame}
						disabled={!selectedGameId || loadingGames}
					>
						{loadingGames ? 'Loading...' : 'Load Game'}
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Re-Authentication Modal */}
			<Modal show={showReAuthModal} onHide={() => setShowReAuthModal(false)} centered>
				<Modal.Header closeButton>
					<Modal.Title>Session Expired</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className="text-center">
						<p className="mb-3">
							Your session has expired. Please sign in again to continue.
						</p>
						<div id="menu-reauth-google-signin-button" className="d-flex justify-content-center" />
					</div>
				</Modal.Body>
			</Modal>

			{/* MCP Authentication Modal */}
			<Modal show={showJwtModal} onHide={() => setShowJwtModal(false)} size="lg" centered>
				<Modal.Header closeButton>
					<Modal.Title>MCP Authentication</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Alert variant="info">
						<h6><FaTools className="me-2" />Admin MCP Access</h6>
						<p className="mb-2">
							You can authenticate with the MCP server using either a JWT token (expires in 15 minutes)
							or a persistent API key. The API key is recommended for long-running integrations.
						</p>
						<small>
							<strong>MCP Endpoint:</strong> <code>{window.location.origin}/api/mcp</code>
						</small>
					</Alert>

					{/* API Key Section */}
					<h6 className="mt-4">API Key (Recommended)</h6>
					<p className="text-muted small mb-2">
						API keys never expire and are ideal for MCP integrations.
					</p>

					{user?.api_key ? (
						<>
							<Form.Label>Your API Key:</Form.Label>
							<InputGroup className="mb-3">
								<Form.Control
									as="input"
									value={user.api_key}
									readOnly
									className="font-monospace"
									style={{ fontSize: '0.85em', wordBreak: 'break-all' }}
									type={showApiKey ? 'text' : 'password'}
								/>
								<Button
									variant="outline-secondary"
									onClick={() => setShowApiKey(!showApiKey)}
									title={showApiKey ? 'Hide API key' : 'Show API key'}
								>
									{showApiKey ? <FaEyeSlash /> : <FaEye />}
								</Button>
								<Button
									variant="outline-primary"
									onClick={handleCopyApiKey}
									title="Copy to clipboard"
								>
									<FaCopy />
								</Button>
							</InputGroup>

							<Form.Label>Claude MCP Command (with API Key):</Form.Label>
							<InputGroup className="mb-3">
								<Form.Control
									as="input"
									value={showApiKey
										? `claude mcp add --transport http stargate-evolution ${API_BASE_URL}/api/mcp --header "Authorization: Bearer ${user.api_key}"`
										: `claude mcp add --transport http stargate-evolution ${API_BASE_URL}/api/mcp --header "Authorization: Bearer [API_KEY_HIDDEN]"`
									}
									readOnly
									className="font-monospace"
									style={{ fontSize: '0.85em', wordBreak: 'break-all' }}
								/>
								<Button
									variant="outline-primary"
									onClick={handleCopyMCPCommandWithApiKey}
									title="Copy MCP command with API key to clipboard"
								>
									<FaCopy />
								</Button>
							</InputGroup>

							<div className="d-grid gap-2 mb-4">
								<Button
									variant="warning"
									onClick={handleGenerateApiKey}
									disabled={isGeneratingApiKey}
								>
									{isGeneratingApiKey ? 'Generating...' : 'Regenerate API Key'}
								</Button>
								<Button
									variant="outline-danger"
									onClick={handleDeleteApiKey}
								>
									Delete API Key
								</Button>
							</div>
						</>
					) : (
						<>
							<Alert variant="secondary" className="mb-3">
								<small>No API key generated yet.</small>
							</Alert>
							<div className="d-grid mb-4">
								<Button
									variant="success"
									onClick={handleGenerateApiKey}
									disabled={isGeneratingApiKey}
								>
									{isGeneratingApiKey ? 'Generating...' : 'Generate API Key'}
								</Button>
							</div>
						</>
					)}

					{/* JWT Token Section */}
					<h6 className="mt-4">JWT Token (Temporary)</h6>
					<p className="text-muted small mb-2">
						JWT tokens expire in 15 minutes and are useful for temporary access.
					</p>

					<Form.Label>JWT Token:</Form.Label>
					<InputGroup className="mb-3">
						<Form.Control
							as="input"
							value={session?.token || ''}
							readOnly
							className="font-monospace"
							style={{ fontSize: '0.85em', wordBreak: 'break-all' }}
							type={showJwtToken ? 'text' : 'password'}
						/>
						<Button
							variant="outline-secondary"
							onClick={() => setShowJwtToken(!showJwtToken)}
							title={showJwtToken ? 'Hide token' : 'Show token'}
						>
							{showJwtToken ? <FaEyeSlash /> : <FaEye />}
						</Button>
						<Button
							variant="outline-primary"
							onClick={handleCopyJwtToken}
							title="Copy to clipboard"
						>
							<FaCopy />
						</Button>
					</InputGroup>

					<Form.Label>Claude MCP Command (with JWT):</Form.Label>
					<InputGroup className="mb-3">
						<Form.Control
							as="input"
							value={showMCPCommand
								? `claude mcp add --transport http stargate-evolution ${API_BASE_URL}/api/mcp --header "Authorization: Bearer ${session?.token || ''}"`
								: `claude mcp add --transport http stargate-evolution ${API_BASE_URL}/api/mcp --header "Authorization: Bearer [JWT_HIDDEN]"`
							}
							readOnly
							className="font-monospace"
							style={{ fontSize: '0.85em', wordBreak: 'break-all' }}
						/>
						<Button
							variant="outline-secondary"
							onClick={() => setShowMCPCommand(!showMCPCommand)}
							title={showMCPCommand ? 'Hide token' : 'Show token'}
						>
							{showMCPCommand ? <FaEyeSlash /> : <FaEye />}
						</Button>
						<Button
							variant="outline-primary"
							onClick={handleCopyMCPCommand}
							title="Copy MCP command to clipboard"
						>
							<FaCopy />
						</Button>
					</InputGroup>

					{session?.expiresAt && (
						<div className="mt-2">
							<small className="text-muted">
								<strong>JWT Expires:</strong> {new Date(session.expiresAt).toLocaleString()}
							</small>
						</div>
					)}

					<Alert variant="warning" className="mt-3">
						<small>
							<strong>Security Warning:</strong> Keep these credentials secure and never share them publicly.
							They provide full administrative access to the game backend.
						</small>
					</Alert>
				</Modal.Body>
			</Modal>
		</div>
	);
};
