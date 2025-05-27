import { gameService } from '@stargate/db';
import React, { useState, useEffect } from 'react';
import { Button, Container, Row, Col, Alert, Modal } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';
import { GiReturnArrow } from 'react-icons/gi';
import { Link, useNavigate } from 'react-router-dom';

import { renderGoogleSignInButton } from '../auth/google-auth';
import { getSession, setSession } from '../auth/session';
import { Toast } from '../toast';

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
	const [games, setGames] = useState<GameSummary[]>([]);
	const [currentView, setCurrentView] = useState<MenuView>('loading');
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [gameToDelete, setGameToDelete] = useState<GameSummary | null>(null);
	const [isDeletingGame, setIsDeletingGame] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		checkAuthAndLoadGames();
	}, []);

	const checkAuthAndLoadGames = async () => {
		const session = getSession();
		if (!session || !session.user) {
			setIsAuthenticated(false);
			setCurrentView('main');
			return;
		}

		setIsAuthenticated(true);
		await loadGames();
	};

	const loadGames = async () => {
		try {
			setCurrentView('loading');

			// Debug database status
			await gameService.debugDatabaseStatus();

			// Load games from local database
			const gamesFromDb = await gameService.listGames();
			console.log('Raw games from database:', gamesFromDb);

			// Convert local Game objects to GameSummary format
			const gameSummaries: GameSummary[] = gamesFromDb.map(game => ({
				id: game.id,
				name: game.name,
				created_at: game.createdAt?.getTime() || null,
				updated_at: game.updatedAt?.getTime() || null,
				last_played: null, // TODO: Track last played time locally
				current: false, // TODO: Track current game locally
			}));

			console.log('Converted games:', gameSummaries);
			setGames(gameSummaries);
			setCurrentView('main');
		} catch (err: any) {
			console.error('Error loading games:', err);
			Toast.show(`Error loading games: ${err.message || err}`, 4000);
			setCurrentView('main');
		}
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

			Toast.show(`Welcome, ${data.user.name || data.user.email}!`, 3500);
			setSession(data);
			setIsAuthenticated(true);
			await loadGames();
		} catch (err: any) {
			Toast.show(`Google login failed: ${err.message || err}`, 4000);
		}
	};

	const handleCreateGame = async () => {
		try {
			setIsCreatingGame(true);
			// Use the new template-based game creation method
			const gameId = await gameService.createNewGameFromTemplates();
			Toast.show('New game created from templates!', 2000);
			onStartGame(gameId);
		} catch (err: any) {
			console.error('Failed to create game from templates:', err);
			Toast.show(`Failed to create game: ${err.message || err}`, 4000);
		} finally {
			setIsCreatingGame(false);
		}
	};

	const onStartGame = (gameId: string) => {
		navigate(`/game/${gameId}`);
	};

	const handleLoadGame = (gameId: string) => {
		onStartGame(gameId);
	};

	const handleContinueGame = () => {
		const currentGame = games.find(g => g.current);
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
			await gameService.deleteGame(gameToDelete.id);
			Toast.show(`Game "${gameToDelete.name}" deleted successfully!`, 3000);

			// Refresh the games list
			await loadGames();

			setShowDeleteConfirm(false);
			setGameToDelete(null);
		} catch (err: any) {
			Toast.show(`Failed to delete game: ${err.message || err}`, 4000);
		} finally {
			setIsDeletingGame(false);
		}
	};

	const cancelDeleteGame = () => {
		setShowDeleteConfirm(false);
		setGameToDelete(null);
	};

	// Google Sign-in button component
	const GoogleSignInButton: React.FC = () => {
		const buttonRef = React.useRef<HTMLDivElement>(null);

		React.useEffect(() => {
			if (buttonRef.current) {
				renderGoogleSignInButton(buttonRef.current.id, handleGoogleSignIn);
			}
		}, []);

		return <div id="google-signin-container" ref={buttonRef} className="d-flex justify-content-center" />;
	};

	const renderLoadGamesView = () => (
		<div className="text-center">
			<h2 className="mb-4">Load Game</h2>
			<div className="list-group mb-4">
				{games.map((game) => (
					<div
						key={game.id}
						className="list-group-item list-group-item-action bg-dark text-white border-secondary d-flex justify-content-between align-items-center"
					>
						<button
							className="btn btn-link text-white text-decoration-none flex-grow-1 text-start p-0"
							onClick={() => handleLoadGame(game.id)}
						>
							<div className="d-flex flex-column align-items-start">
								<div className="d-flex w-100 justify-content-start align-items-center mb-1">
									<h5 className="mb-0 me-2">{game.name}</h5>
									{game.current && <span className="badge bg-primary">Current</span>}
								</div>
								{(game.last_played || game.updated_at) && (
									<small className="text-muted">
										{game.last_played
											? `${new Date(game.last_played).toLocaleDateString()} at ${new Date(game.last_played).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
											: `${new Date(game.updated_at!).toLocaleDateString()} at ${new Date(game.updated_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
										}
									</small>
								)}
							</div>
						</button>
						<button
							className="btn btn-outline-danger btn-sm ms-2"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteGame(game);
							}}
							title="Delete Game"
						>
							<FaTrash size={14} />
						</button>
					</div>
				))}
			</div>
			<button
				className="btn btn-secondary"
				onClick={() => setCurrentView('main')}
			>
				<GiReturnArrow size={20} className="me-1" />Back
			</button>

		</div>
	);

	const renderMainView = () => {
		if (!isAuthenticated) {
			return (
				<div className="text-center">
					<p className="mb-4">Please sign in to access your games:</p>
					<GoogleSignInButton />
				</div>
			);
		}

		const hasCurrent = games.some(g => g.current);
		const hasAny = games.length > 0;

		return (
			<div className="text-center">
				<div className="d-grid gap-3">
					{hasCurrent && (
						<button
							className="btn btn-primary btn-lg"
							onClick={handleContinueGame}
						>
							Continue Game
						</button>
					)}
					<button
						className="btn btn-success btn-lg"
						onClick={handleCreateGame}
						disabled={isCreatingGame}
					>
						{isCreatingGame ? (
							<>
								<span className="spinner-border spinner-border-sm me-2" role="status" />
								Creating Game...
							</>
						) : (
							'Create New Game'
						)}
					</button>
					{hasAny && (
						<button
							className="btn btn-info btn-lg"
							onClick={() => setCurrentView('load-games')}
						>
							Load Game
						</button>
					)}
				</div>
			</div>
		);
	};

	const renderLoadingView = () => (
		<div className="text-center">
			<div className="spinner-border text-primary mb-3" role="status">
				<span className="visually-hidden">Loading...</span>
			</div>
			<p>Loading games...</p>
		</div>
	);

	return (
		<div
			className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
			style={{
				backgroundColor: 'rgba(10,12,24,0.92)',
				zIndex: 3000,
			}}
		>
			{/* Delete Confirmation Modal - Always rendered */}
			<Modal show={showDeleteConfirm} onHide={cancelDeleteGame} centered style={{ zIndex: 9001 }}>
				<Modal.Header closeButton className="bg-dark text-white border-secondary">
					<Modal.Title>Confirm Delete Game</Modal.Title>
				</Modal.Header>
				<Modal.Body className="bg-dark text-white">
					<p>Are you sure you want to delete the game <strong>&ldquo;{gameToDelete?.name}&rdquo;</strong>?</p>
					<p className="text-warning">
						<strong>Warning:</strong> This action cannot be undone. All game data including galaxies,
						star systems, crew members, and progress will be permanently deleted.
					</p>
				</Modal.Body>
				<Modal.Footer className="bg-dark border-secondary">
					<Button variant="secondary" onClick={cancelDeleteGame} disabled={isDeletingGame}>
						Cancel
					</Button>
					<Button
						variant="danger"
						onClick={confirmDeleteGame}
						disabled={isDeletingGame}
					>
						{isDeletingGame ? (
							<>
								<span className="spinner-border spinner-border-sm me-2" role="status" />
								Deleting...
							</>
						) : (
							'Delete Game'
						)}
					</Button>
				</Modal.Footer>
			</Modal>

			<div
				className="bg-dark text-white rounded-4 shadow-lg p-5"
				style={{
					minWidth: '340px',
					maxWidth: '90vw',
					backgroundColor: '#181a2a !important',
				}}
			>
				<div className="text-center mb-4">
					<h1 className="display-4 mb-3" style={{ letterSpacing: '0.04em' }}>
						Stargate Evolution
					</h1>
				</div>

				{currentView === 'loading' && renderLoadingView()}
				{currentView === 'main' && renderMainView()}
				{currentView === 'load-games' && renderLoadGamesView()}
			</div>


		</div>
	);
};
