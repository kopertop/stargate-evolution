import type { Session } from '@stargate/common';
import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Container, Row, Col } from 'react-bootstrap';
import { FaTools, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

import { useGameController } from '../services/game-controller';

import { renderGoogleSignInButton } from '../auth/google-auth';
import { getSession, setSession, clearSession, validateOrRefreshSession } from '../auth/session';

import './google-login.css';

type User = {
	id: string;
	email: string;
	name: string;
	picture?: string;
	is_admin: boolean;
};

export const MenuPage: React.FC = () => {
	const navigate = useNavigate();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [focusedMenuItem, setFocusedMenuItem] = useState(0);
	const controller = useGameController();

	useEffect(() => {
		checkAuthStatus();
	}, []);

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

		// Get menu item count based on auth state
		const getMenuItemCount = (currentUser: User | null) => {
			if (!currentUser) return 1; // Just sign in button
			let count = 2; // Start Game + Continue
			if (currentUser.is_admin) count++; // Admin Panel
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
				// Not signed in - only Google sign in available
				if (state.focusedMenuItem === 0) {
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
				navigate('/game');
			} else if (itemIndex === 1) {
				// Continue (currently disabled)
				toast.info('Continue feature coming soon');
			} else if (state.user.is_admin && itemIndex === 2) {
				// Admin Panel (only if admin)
				handleAdminAccess();
			} else if (itemIndex === (state.user.is_admin ? 3 : 2)) {
				// Sign Out (last item)
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

	const checkAuthStatus = async () => {
		try {
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';
			const validSession = await validateOrRefreshSession(API_URL);

			if (validSession?.user) {
				setUser({
					...validSession.user,
					picture: validSession.user.picture || undefined,
				});
			}
		} catch (error) {
			console.error('Failed to validate session:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignIn = async (idToken: string) => {
		try {
			setLoading(true);
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';
			const res = await fetch(`${API_URL}/api/auth/google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Auth failed');

			setSession(data);
			setUser(data.user);
			toast.success(`Welcome, ${data.user.name}!`);
		} catch (error: any) {
			toast.error(error.message || 'Authentication failed');
		} finally {
			setLoading(false);
		}
	};

	const handleSignOut = () => {
		clearSession();
		setUser(null);
		toast.info('Signed out successfully');
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
		navigate('/admin');
	};

	// Google Sign-In Component
	const GoogleSignInButton: React.FC = () => {
		useEffect(() => {
			renderGoogleSignInButton('google-signin-button', handleGoogleSignIn);
		}, []);

		return <div id="google-signin-button" className="d-flex justify-content-center" />;
	};

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
												<div>
													<span className="badge bg-success ms-2">Admin</span>
												</div>
											)}
										</div>
									</div>

									<div className="d-grid gap-2 mb-3">
										<Button 
											variant={focusedMenuItem === 0 ? "success" : "outline-success"} 
											size="lg" 
											onClick={() => navigate('/game')}
											style={focusedMenuItem === 0 ? { boxShadow: '0 0 10px rgba(25, 135, 84, 0.8)' } : {}}
										>
											Start New Game
										</Button>
										<Button 
											variant={focusedMenuItem === 1 ? "secondary" : "outline-secondary"} 
											size="lg" 
											disabled 
											title="TODO: Resume last game (not yet implemented)"
											style={focusedMenuItem === 1 ? { boxShadow: '0 0 10px rgba(108, 117, 125, 0.8)' } : {}}
										>
											Continue (TODO)
										</Button>
									</div>

									<div className="d-grid gap-2">
										{user.is_admin ? (
											<Button 
												variant={focusedMenuItem === 2 ? "primary" : "outline-primary"} 
												size="lg" 
												onClick={handleAdminAccess}
												style={focusedMenuItem === 2 ? { boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)' } : {}}
											>
												<FaTools className="me-2" />
												Admin Panel
											</Button>
										) : (
											<div className="text-center text-muted">
												<p>Admin access required for this application.</p>
												<p>Please contact an administrator for access.</p>
											</div>
										)}

										<Button 
											variant={focusedMenuItem === (user.is_admin ? 3 : 2) ? "secondary" : "outline-secondary"} 
											onClick={handleSignOut}
											style={focusedMenuItem === (user.is_admin ? 3 : 2) ? { boxShadow: '0 0 10px rgba(108, 117, 125, 0.8)' } : {}}
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
									<h5 className="card-title text-center mb-4">Sign In Required</h5>
									<p className="text-center text-muted mb-4">
										Signing in will let you save and restore your progress.
									</p>
									<div 
										className="d-grid"
										style={focusedMenuItem === 0 ? { 
											border: '2px solid #007bff', 
											borderRadius: '5px', 
											padding: '8px',
											boxShadow: '0 0 10px rgba(13, 110, 253, 0.8)'
										} : {}}
									>
										<GoogleSignInButton />
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
		</div>
	);
};
