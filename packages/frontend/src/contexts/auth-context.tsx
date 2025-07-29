import type { Session } from '@stargate/common';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

import { initializePWAAuthHandling, ensurePWASessionPersistence } from '../auth/google-auth';
import { getSession, setSession, clearSession, validateOrRefreshSession, initializePWASessionPersistence } from '../auth/session';
import { getEnhancedDeviceInfo } from '../utils/mobile-utils';

type User = {
	id: string;
	email: string;
	name: string;
	picture?: string;
	is_admin: boolean;
	api_key?: string | null;
};

interface AuthContextType {
	user: User | null;
	session: Session | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	isTokenExpired: boolean;
	signIn: (idToken: string) => Promise<void>;
	signOut: () => void;
	reAuthenticate: (idToken: string) => Promise<void>;
	checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSessionState] = useState<Session | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isTokenExpired, setIsTokenExpired] = useState(false);

	const isAuthenticated = !!user && !!session && !isTokenExpired;
	const deviceInfo = getEnhancedDeviceInfo();

	// Check authentication status
	const checkAuthStatus = useCallback(async () => {
		try {
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';
			const validSession = await validateOrRefreshSession(API_URL);

			if (validSession?.user) {
				setUser({
					...validSession.user,
					picture: validSession.user.picture || undefined,
				});
				setSessionState(validSession);
				setIsTokenExpired(false);
				console.log('[AUTH] Valid session found for user:', validSession.user.email);
			} else {
				// Session validation failed
				setUser(null);
				setSessionState(null);
				setIsTokenExpired(true);
				console.log('[AUTH] Session validation failed - user needs to re-authenticate');
			}
		} catch (error) {
			console.error('[AUTH] Failed to validate session:', error);
			setUser(null);
			setSessionState(null);
			setIsTokenExpired(true);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Sign in with Google ID token
	const signIn = useCallback(async (idToken: string) => {
		try {
			setIsLoading(true);
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

			// Use longer timeout for PWA mode
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), deviceInfo.isPWA ? 20000 : 10000);

			const res = await fetch(`${API_URL}/api/auth/google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Auth failed');

			setSession(data);
			setSessionState(data);
			setUser(data.user);
			setIsTokenExpired(false);

			console.log('[AUTH] User signed in:', data.user.email, deviceInfo.isPWA ? '(PWA mode)' : '');

			const welcomeMessage = deviceInfo.isPWA
				? `Welcome to PWA mode, ${data.user.name}!`
				: `Welcome, ${data.user.name}!`;
			toast.success(welcomeMessage);
		} catch (error: any) {
			console.error('[AUTH] Sign in failed:', error);

			// More specific error messages for PWA mode
			let errorMessage = error.message || 'Authentication failed';
			if (deviceInfo.isPWA && error.name === 'AbortError') {
				errorMessage = 'Sign-in timed out in PWA mode. Please try again.';
			} else if (deviceInfo.isPWA && error.name === 'NetworkError') {
				errorMessage = 'Network error in PWA mode. Please check your connection and try again.';
			}

			toast.error(errorMessage);
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, [deviceInfo.isPWA]);

	// Re-authenticate (for when token expires during game)
	const reAuthenticate = useCallback(async (idToken: string) => {
		try {
			setIsLoading(true);
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

			// Use longer timeout for PWA mode
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), deviceInfo.isPWA ? 20000 : 10000);

			const res = await fetch(`${API_URL}/api/auth/google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Auth failed');

			setSession(data);
			setSessionState(data);
			setUser(data.user);
			setIsTokenExpired(false);

			console.log('[AUTH] User re-authenticated:', data.user.email, deviceInfo.isPWA ? '(PWA mode)' : '');

			const successMessage = deviceInfo.isPWA
				? 'Re-authenticated successfully in PWA mode! You can now save your game.'
				: 'Re-authenticated successfully! You can now save your game.';
			toast.success(successMessage);
		} catch (error: any) {
			console.error('[AUTH] Re-authentication failed:', error);

			// More specific error messages for PWA mode
			let errorMessage = error.message || 'Re-authentication failed';
			if (deviceInfo.isPWA && error.name === 'AbortError') {
				errorMessage = 'Re-authentication timed out in PWA mode. Please try again.';
			} else if (deviceInfo.isPWA && error.name === 'NetworkError') {
				errorMessage = 'Network error during re-authentication in PWA mode. Please check your connection.';
			}

			toast.error(errorMessage);
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, [deviceInfo.isPWA]);

	// Sign out
	const signOut = useCallback(() => {
		clearSession();
		setUser(null);
		setSessionState(null);
		setIsTokenExpired(false);
		console.log('[AUTH] User signed out');
		toast.info('Signed out successfully');
	}, []);

	// Initialize PWA-specific authentication handling
	useEffect(() => {
		if (deviceInfo.isPWA) {
			console.log('[AUTH] Initializing PWA authentication handling');
			initializePWAAuthHandling();
			ensurePWASessionPersistence();
			initializePWASessionPersistence();
		}
	}, [deviceInfo.isPWA]);

	// Check auth status on mount
	useEffect(() => {
		checkAuthStatus();
	}, [checkAuthStatus]);

	// Periodic token validation (every 5 minutes)
	useEffect(() => {
		if (!isAuthenticated) return;

		const interval = setInterval(() => {
			console.log('[AUTH] Performing periodic token validation...');
			checkAuthStatus();
		}, 5 * 60 * 1000); // 5 minutes

		return () => clearInterval(interval);
	}, [isAuthenticated, checkAuthStatus]);

	// Listen for authentication errors from API calls
	useEffect(() => {
		const handleAuthError = (event: CustomEvent) => {
			console.log('[AUTH] Received authentication error event:', event.detail);
			setIsTokenExpired(true);

			// Don't automatically sign out - just mark token as expired
			// This allows the user to re-authenticate without losing game state
			const message = deviceInfo.isPWA
				? 'Your session has expired. Please sign in again to continue in PWA mode.'
				: 'Your session has expired. Please sign in again to save your progress.';
			toast.warning(message);
		};

		const handleSessionLost = () => {
			console.log('[AUTH] Session lost event received');
			setUser(null);
			setSessionState(null);
			setIsTokenExpired(true);

			if (deviceInfo.isPWA) {
				toast.error('Session lost in PWA mode. Please sign in again.');
			}
		};

		const handleSessionChanged = () => {
			console.log('[AUTH] Session changed in another tab');
			checkAuthStatus();
		};

		const handleSessionExpiring = () => {
			console.log('[AUTH] Session expiring soon');
			if (deviceInfo.isPWA) {
				toast.warning('Your session will expire soon. Please save your progress.');
			}
		};

		window.addEventListener('auth-error' as any, handleAuthError);
		window.addEventListener('session-lost' as any, handleSessionLost);
		window.addEventListener('session-changed' as any, handleSessionChanged);
		window.addEventListener('session-expiring' as any, handleSessionExpiring);

		return () => {
			window.removeEventListener('auth-error' as any, handleAuthError);
			window.removeEventListener('session-lost' as any, handleSessionLost);
			window.removeEventListener('session-changed' as any, handleSessionChanged);
			window.removeEventListener('session-expiring' as any, handleSessionExpiring);
		};
	}, [deviceInfo.isPWA, checkAuthStatus]);

	return (
		<AuthContext.Provider value={{
			user,
			session,
			isAuthenticated,
			isLoading,
			isTokenExpired,
			signIn,
			signOut,
			reAuthenticate,
			checkAuthStatus,
		}}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
