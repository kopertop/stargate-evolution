import type { Session } from '@stargate/common';
import React, { useState, useEffect } from 'react';
import { Button, Card, Container, Row, Col } from 'react-bootstrap';
import { FaTools, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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

	useEffect(() => {
		checkAuthStatus();
	}, []);

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
							<p className="lead">Admin Panel Access</p>
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

									<div className="d-grid gap-2">
										{user.is_admin ? (
											<Button variant="primary" size="lg" onClick={handleAdminAccess}>
												<FaTools className="me-2" />
												Admin Panel
											</Button>
										) : (
											<div className="text-center text-muted">
												<p>Admin access required for this application.</p>
												<p>Please contact an administrator for access.</p>
											</div>
										)}

										<Button variant="outline-secondary" onClick={handleSignOut}>
											<FaSignOutAlt className="me-2" />
											Sign Out
										</Button>
									</div>
								</Card.Body>
							</Card>
						) : (
							<Card bg="dark" text="light" border="secondary">
								<Card.Body>
									<h5 className="card-title text-center mb-4">Sign In Required</h5>
									<p className="text-center text-muted mb-4">
										Sign in with Google to access the Stargate Evolution Admin Panel
									</p>
									<div className="d-grid">
										<GoogleSignInButton />
									</div>
								</Card.Body>
							</Card>
						)}
					</Col>
				</Row>
			</Container>
		</div>
	);
};
