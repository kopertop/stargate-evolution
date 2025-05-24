import React, { useState, useEffect } from 'react';
import { gameService } from '@stargate/db';

import { renderGoogleSignInButton } from '../auth/google-auth';
import { getSession, setSession } from '../auth/session';
import { Toast } from '../toast';
import { redirect, useNavigate } from 'react-router-dom';

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
			const gameId = await gameService.createNewGame();
			Toast.show('New game created!', 2000);
			onStartGame(gameId);
		} catch (err: any) {
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
					<button
						key={game.id}
						className="list-group-item list-group-item-action bg-dark text-white border-secondary text-center"
						onClick={() => handleLoadGame(game.id)}
					>
						<div className="d-flex flex-column align-items-center">
							<div className="d-flex w-100 justify-content-center align-items-center mb-1">
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
				))}
			</div>
			<button
				className="btn btn-secondary"
				onClick={() => setCurrentView('main')}
			>
				← Back
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
				zIndex: 3000
			}}
		>
			<div
				className="bg-dark text-white rounded-4 shadow-lg p-5"
				style={{
					minWidth: '340px',
					maxWidth: '90vw',
					backgroundColor: '#181a2a !important'
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
