import type { Session } from '@stargate/common';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

import { getSession, setSession, clearSession, validateOrRefreshSession } from '../auth/session';

type User = {
	id: string;
	email: string;
	name: string;
	picture?: string;
	is_admin: boolean;
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
			const res = await fetch(`${API_URL}/api/auth/google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Auth failed');

			setSession(data);
			setSessionState(data);
			setUser(data.user);
			setIsTokenExpired(false);

			console.log('[AUTH] User signed in:', data.user.email);
			toast.success(`Welcome, ${data.user.name}!`);
		} catch (error: any) {
			console.error('[AUTH] Sign in failed:', error);
			toast.error(error.message || 'Authentication failed');
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Re-authenticate (for when token expires during game)
	const reAuthenticate = useCallback(async (idToken: string) => {
		try {
			setIsLoading(true);
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';
			const res = await fetch(`${API_URL}/api/auth/google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Auth failed');

			setSession(data);
			setSessionState(data);
			setUser(data.user);
			setIsTokenExpired(false);

			console.log('[AUTH] User re-authenticated:', data.user.email);
			toast.success('Re-authenticated successfully! You can now save your game.');
		} catch (error: any) {
			console.error('[AUTH] Re-authentication failed:', error);
			toast.error(error.message || 'Re-authentication failed');
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Sign out
	const signOut = useCallback(() => {
		clearSession();
		setUser(null);
		setSessionState(null);
		setIsTokenExpired(false);
		console.log('[AUTH] User signed out');
		toast.info('Signed out successfully');
	}, []);

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
			toast.warning('Your session has expired. Please sign in again to save your progress.');
		};

		window.addEventListener('auth-error' as any, handleAuthError);
		return () => window.removeEventListener('auth-error' as any, handleAuthError);
	}, []);

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
