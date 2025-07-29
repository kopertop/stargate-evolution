import type { Session } from '@stargate/common';

import { getEnhancedDeviceInfo } from '../utils/mobile-utils';

const SESSION_KEY = 'stargate-session';
const PWA_SESSION_BACKUP_KEY = 'stargate-pwa-session-backup';

export function getSession(): Session | null {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) {
			// In PWA mode, also check backup storage
			return getPWABackupSession();
		}
		return JSON.parse(raw) as Session;
	} catch {
		// If main session is corrupted, try backup in PWA mode
		return getPWABackupSession();
	}
}

export function setSession(session: Session) {
	try {
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));

		// In PWA mode, also create a backup for reliability
		const deviceInfo = getEnhancedDeviceInfo();
		if (deviceInfo.isPWA) {
			setPWABackupSession(session);
		}

		console.log('[SESSION] Session stored successfully', {
			isPWA: deviceInfo.isPWA,
			hasBackup: deviceInfo.isPWA,
		});
	} catch (error) {
		console.error('[SESSION] Failed to store session:', error);
		// Try to at least store in backup if main storage fails
		try {
			setPWABackupSession(session);
		} catch (backupError) {
			console.error('[SESSION] Failed to store backup session:', backupError);
		}
	}
}

export function clearSession() {
	try {
		localStorage.removeItem(SESSION_KEY);
		localStorage.removeItem(PWA_SESSION_BACKUP_KEY);
		console.log('[SESSION] Session cleared successfully');
	} catch (error) {
		console.error('[SESSION] Failed to clear session:', error);
	}
}

/**
 * PWA-specific session backup management
 */
function getPWABackupSession(): Session | null {
	try {
		const raw = localStorage.getItem(PWA_SESSION_BACKUP_KEY);
		if (!raw) return null;

		const backup = JSON.parse(raw);

		// Check if backup is not too old (24 hours)
		if (backup.timestamp && Date.now() - backup.timestamp > 24 * 60 * 60 * 1000) {
			localStorage.removeItem(PWA_SESSION_BACKUP_KEY);
			return null;
		}

		return backup.session as Session;
	} catch {
		return null;
	}
}

function setPWABackupSession(session: Session): void {
	try {
		const backup = {
			session,
			timestamp: Date.now(),
		};
		localStorage.setItem(PWA_SESSION_BACKUP_KEY, JSON.stringify(backup));
	} catch (error) {
		console.error('[SESSION] Failed to create PWA backup session:', error);
	}
}

export async function validateOrRefreshSession(apiUrl: string): Promise<Session | null> {
	const session = getSession();
	if (!session) return null;

	const deviceInfo = getEnhancedDeviceInfo();
	console.log('[SESSION] Validating session in PWA mode:', deviceInfo.isPWA);

	try {
		// Try to validate access token with PWA-optimized timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), deviceInfo.isPWA ? 15000 : 10000);

		const res = await fetch(`${apiUrl}/api/auth/validate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: session.token }),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		// Check if we got a valid response (could be 200 or 401)
		if (res.status === 200 || res.status === 401) {
			try {
				const validationData = await res.json();

				// If validation succeeded, update session with latest user data
				if (validationData.valid && validationData.user) {
					const updatedSession = {
						...session,
						user: validationData.user,
					};
					setSession(updatedSession);
					console.log('[SESSION] Session validation successful');
					return updatedSession;
				}

				// If validation failed (valid: false), try to refresh the token
				if (!validationData.valid && session.refreshToken) {
					console.log('[SESSION] Token invalid, attempting refresh');
					return await attemptTokenRefresh(apiUrl, session, deviceInfo);
				}
			} catch (error) {
				console.error('[SESSION] Failed to parse validation response:', error);

				// In PWA mode, be more lenient with parsing errors
				if (deviceInfo.isPWA && res.ok) {
					console.log('[SESSION] PWA mode: assuming session is valid despite parsing error');
					return session;
				}
			}
		}

		// Handle network errors in PWA mode
		if (deviceInfo.isPWA && (res.status >= 500 || res.status === 0)) {
			console.log('[SESSION] PWA mode: network error, keeping existing session');
			return session;
		}

	} catch (error: any) {
		console.error('[SESSION] Session validation failed:', error);

		// In PWA mode, handle network errors more gracefully
		if (deviceInfo.isPWA && (error.name === 'AbortError' || error.name === 'NetworkError')) {
			console.log('[SESSION] PWA mode: network error during validation, keeping existing session');
			return session;
		}
	}

	// If we reach here, both validation and refresh failed
	console.log('[SESSION] Session validation and refresh failed, clearing session');
	clearSession();
	return null;
}

/**
 * Attempt to refresh the authentication token with PWA-specific handling
 */
async function attemptTokenRefresh(apiUrl: string, session: Session, deviceInfo: any): Promise<Session | null> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), deviceInfo.isPWA ? 20000 : 15000);

		const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: session.refreshToken }),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (refreshRes.ok) {
			const newSession = await refreshRes.json();
			setSession(newSession);
			console.log('[SESSION] Token refresh successful');
			return newSession;
		} else {
			console.log('[SESSION] Token refresh failed with status:', refreshRes.status);
		}
	} catch (error: any) {
		console.error('[SESSION] Token refresh failed:', error);

		// In PWA mode, if refresh fails due to network issues, keep the old session
		if (deviceInfo.isPWA && (error.name === 'AbortError' || error.name === 'NetworkError')) {
			console.log('[SESSION] PWA mode: refresh network error, keeping existing session');
			return session;
		}
	}

	return null;
}

/**
 * Enhanced session persistence monitoring for PWA mode
 */
export function initializePWASessionPersistence(): void {
	const deviceInfo = getEnhancedDeviceInfo();

	if (!deviceInfo.isPWA) {
		return;
	}

	console.log('[SESSION] Initializing PWA session persistence');

	// Listen for app visibility changes
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			console.log('[SESSION] App became visible, checking session integrity');

			// Verify session is still in storage
			const session = getSession();
			if (session) {
				console.log('[SESSION] Session found after visibility change');
			} else {
				console.warn('[SESSION] Session lost after visibility change');
				// Dispatch event to notify auth context
				window.dispatchEvent(new CustomEvent('session-lost'));
			}
		}
	});

	// Listen for storage events (cross-tab communication)
	window.addEventListener('storage', (event) => {
		if (event.key === SESSION_KEY) {
			console.log('[SESSION] Session changed in another tab');
			// Notify auth context of session change
			window.dispatchEvent(new CustomEvent('session-changed'));
		}
	});

	// Periodic session integrity check (every 5 minutes in PWA mode)
	setInterval(() => {
		const session = getSession();
		if (session) {
			// Check if session is approaching expiration
			if (session.expiresAt && session.expiresAt - Date.now() < 5 * 60 * 1000) {
				console.log('[SESSION] Session approaching expiration, notifying auth context');
				window.dispatchEvent(new CustomEvent('session-expiring'));
			}
		}
	}, 5 * 60 * 1000);
}
