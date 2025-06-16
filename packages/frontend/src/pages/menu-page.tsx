import { useQuery } from '@livestore/react';
import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';
import { GiReturnArrow } from 'react-icons/gi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import './google-login.css';
import { renderGoogleSignInButton } from '../auth/google-auth';
import { getSession, setSession, validateOrRefreshSession, clearSession } from '../auth/session';
import { useGameService } from '../services/game-service';

type GameSummary = {
	id: string;
	name: string;
	created_at: number | null;
	updated_at: number | null;
	last_played: number | null;
	current: boolean;
};

type MenuView = 'main' | 'load-games' | 'loading';

export const MenuPage: React.FC = () => {
	const [currentView, setCurrentView] = useState<MenuView>('loading');
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [gameToDelete, setGameToDelete] = useState<GameSummary | null>(null);
	const [isDeletingGame, setIsDeletingGame] = useState(false);
	const navigate = useNavigate();

	// Use the new LiveStore-based game service
	const gameService = useGameService();

	// Query all games using LiveStore
	const gamesQuery = useQuery(gameService.queries.allGames());
	const games = gamesQuery || [];

	// Convert LiveStore game records to GameSummary format
	const gameSummaries: GameSummary[] = games.map((game: any) => ({
		id: game.id,
		name: game.name,
		created_at: game.createdAt?.getTime() || null,
		updated_at: game.updatedAt?.getTime() || null,
		last_played: game.lastPlayed?.getTime() || null,
		current: false, // TODO: Track current game
	}));

	useEffect(() => {
		checkAuthAndLoadGames();
	}, []);

	const checkAuthAndLoadGames = async () => {
		const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

		// Validate/refresh session to get latest admin status
		const validSession = await validateOrRefreshSession(API_URL);

		if (!validSession || !validSession.user) {
			setIsAuthenticated(false);
			setCurrentView('main');
			return;
		}

		setIsAuthenticated(true);
		setCurrentView('main'); // No need to load games explicitly - LiveStore handles it
	};

	const handleGoogleSignIn = async (idToken: string) => {
		try {
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';
			const res = await fetch(`${API_URL}/api/auth/google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Auth failed');

			// Store the initial session
			setSession(data);

			// Validate the session to get the latest user data (including admin status)
			const validatedSession = await validateOrRefreshSession(API_URL);
			if (!validatedSession) {
				throw new Error('Failed to validate session after login');
			}

			toast.success(`Welcome, ${validatedSession.user.name || validatedSession.user.email}!`, {
				position: 'top-right',
				autoClose: 3500,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});

			setIsAuthenticated(true);
			setCurrentView('main');
		} catch (err: any) {
			toast.error(`Google login failed: ${err.message || err}`, {
				position: 'top-right',
				autoClose: 4000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});
		}
	};

	const handleCreateGame = async () => {
		try {
			setIsCreatingGame(true);

			// For now, create a simple game - we can enhance this later with templates
			const game_id = await gameService.createNewGame('New Stargate Game');

			toast.success('New game created!', {
				position: 'top-right',
				autoClose: 2000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});
			onStartGame(game_id);
		} catch (err: any) {
			console.error('Failed to create game:', err);
			toast.error(`Failed to create game: ${err.message || err}`, {
				position: 'top-right',
				autoClose: 4000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});
		} finally {
			setIsCreatingGame(false);
		}
	};

	const onStartGame = (game_id: string) => {
		navigate(`/game/${game_id}`);
	};

	const handleLoadGame = (game_id: string) => {
		onStartGame(game_id);
	};

	const handleContinueGame = () => {
		const currentGame = gameSummaries.find(g => g.current);
		if (currentGame) {
			onStartGame(currentGame.id);
		}
	};

	const handleDeleteGame = async (game: GameSummary) => {
		console.log('Delete button clicked for game:', game);
		setGameToDelete(game);
		setShowDeleteConfirm(true);
	};

	const confirmDeleteGame = async () => {
		if (!gameToDelete) return;

		try {
			setIsDeletingGame(true);
			gameService.deleteGame(gameToDelete.id);

			toast.success(`Game "${gameToDelete.name}" deleted successfully!`, {
				position: 'top-right',
				autoClose: 3000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});

			setShowDeleteConfirm(false);
			setGameToDelete(null);
		} catch (err: any) {
			toast.error(`Failed to delete game: ${err.message || err}`, {
				position: 'top-right',
				autoClose: 4000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});
		} finally {
			setIsDeletingGame(false);
		}
	};

	const cancelDeleteGame = () => {
		setShowDeleteConfirm(false);
		setGameToDelete(null);
	};

	const handleLogout = () => {
		clearSession();
		setIsAuthenticated(false);
		toast.success('Logged out successfully', {
			position: 'top-right',
			autoClose: 2000,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
		});
	};

	const GoogleSignInButton: React.FC = () => {
		useEffect(() => {
			renderGoogleSignInButton('google-signin-button', handleGoogleSignIn);
		}, []);

		return <div id="google-signin-button" className="d-flex justify-content-center"/>;
	};

	const renderLoadGamesView = () => (
		<div className="card mx-auto" style={{ maxWidth: '600px' }}>
			<div className="card-header bg-warning text-dark">
				<h4 className="mb-0">Load Game</h4>
			</div>
			<div className="card-body">
				{gameSummaries.length === 0 ? (
					<div className="text-center">
						<p>No saved games found.</p>
						<Button variant="secondary" onClick={() => setCurrentView('main')}>
							<GiReturnArrow /> Back to Main Menu
						</Button>
					</div>
				) : (
					<>
						<div className="row g-3">
							{gameSummaries.map(game => (
								<div key={game.id} className="col-12">
									<div className="card">
										<div className="card-body d-flex justify-content-between align-items-center">
											<div>
												<h6 className="card-title mb-1">{game.name}</h6>
												<small className="text-muted">
													{game.last_played
														? `Last played: ${new Date(game.last_played).toLocaleDateString()}`
														: 'Never played'}
												</small>
											</div>
											<div className="d-flex gap-2">
												<Button
													size="sm"
													variant="success"
													onClick={() => handleLoadGame(game.id)}
												>
													Load
												</Button>
												<Button
													size="sm"
													variant="danger"
													onClick={() => handleDeleteGame(game)}
													disabled={isDeletingGame}
												>
													<FaTrash />
												</Button>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
						<div className="text-center mt-3">
							<Button variant="secondary" onClick={() => setCurrentView('main')}>
								<GiReturnArrow /> Back to Main Menu
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);

	const renderMainView = () => {
		const hasCurrentGame = gameSummaries.some(g => g.current);
		const session = getSession();
		const isAdmin = session?.user?.is_admin;

		return (
			<div className="card mx-auto" style={{ maxWidth: '400px' }}>
				<div className="card-header bg-primary text-white">
					<h2 className="text-center mb-0">Stargate Evolution</h2>
				</div>
				<div className="card-body">
					<div className="d-grid gap-3">
						{/* Continue Game - only show if there's a current game */}
						{hasCurrentGame && (
							<Button size="lg" variant="success" onClick={handleContinueGame}>
								Continue Game
							</Button>
						)}

						{/* New Game */}
						<Button
							size="lg"
							variant="primary"
							onClick={handleCreateGame}
							disabled={isCreatingGame}
						>
							{isCreatingGame ? 'Creating...' : 'New Game'}
						</Button>

						{/* Load Game */}
						{games.length > 0 && (
							<Button
								size="lg"
								variant="warning"
								onClick={() => setCurrentView('load-games')}
							>
							Load Game
							</Button>
						)}

						{/* Admin Panel - only show for admin users */}
						{isAdmin && (
							<Button
								size="lg"
								variant="danger"
								onClick={() => navigate('/admin')}
							>
								Admin Panel
							</Button>
						)}

						{/* Authentication section */}
						{!isAuthenticated ? (
							<div className="mt-4 text-center">
								<p className="mb-2">Sign in for cloud saves:</p>
								<GoogleSignInButton />
							</div>
						) : (
							<div className="mt-4 text-center">
								<p className="mb-2 text-muted">
									Signed in as: {session?.user?.name || session?.user?.email}
								</p>
								<Button variant="outline-secondary" onClick={handleLogout}>
									Logout
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	const renderLoadingView = () => (
		<div className="text-center d-flex flex-column align-items-center">
			<div className="spinner-border text-primary" role="status">
				<span className="visually-hidden">Loading...</span>
			</div>
			<p className="mt-2">Loading LiveStore...</p>
			<Button onClick={async () => {
				const storeId = 'stargate-game-store-v2';
				if ('storage' in navigator && navigator.storage && navigator.storage.getDirectory) {
					try {
						const root = await navigator.storage.getDirectory();
						await root.removeEntry(storeId, { recursive: true });
						toast.success(`OPFS store '${storeId}' cleared! Reloading...`);
						setTimeout(() => window.location.reload(), 1000);
					} catch (e: any) {
						toast.error('Failed to clear OPFS store: ' + (e?.message || e));
					}
				} else {
					toast.warn('OPFS not supported in this browser');
				}
			}}>Clear LiveStore</Button>
		</div>
	);

	return (
		<div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-dark text-light">
			<div className="w-100" style={{ maxWidth: '800px' }}>
				{currentView === 'loading' && renderLoadingView()}
				{currentView === 'main' && renderMainView()}
				{currentView === 'load-games' && renderLoadGamesView()}

				{/* Delete Confirmation Modal */}
				<Modal show={showDeleteConfirm} onHide={cancelDeleteGame}>
					<Modal.Header closeButton>
						<Modal.Title>Confirm Delete</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						Are you sure you want to delete the game &ldquo;{gameToDelete?.name}&rdquo;? This action cannot be undone.
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={cancelDeleteGame}>
							Cancel
						</Button>
						<Button
							variant="danger"
							onClick={confirmDeleteGame}
							disabled={isDeletingGame}
						>
							{isDeletingGame ? 'Deleting...' : 'Delete'}
						</Button>
					</Modal.Footer>
				</Modal>
			</div>
		</div>
	);
};
