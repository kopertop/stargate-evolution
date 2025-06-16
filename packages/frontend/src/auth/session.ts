import type { Session } from '@stargate/common';

const SESSION_KEY = 'stargate-session';

export function getSession(): Session | null {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as Session;
	} catch {
		return null;
	}
}

export function setSession(session: Session) {
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
	localStorage.removeItem(SESSION_KEY);
}

export async function validateOrRefreshSession(apiUrl: string): Promise<Session | null> {
	const session = getSession();
	if (!session) return null;

	// Try to validate access token
	const res = await fetch(`${apiUrl}/api/auth/validate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token: session.token }),
	});

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
				return updatedSession;
			}

			// If validation failed (valid: false), try to refresh the token
			if (!validationData.valid && session.refreshToken) {
				const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken: session.refreshToken }),
				});

				if (refreshRes.ok) {
					const newSession = await refreshRes.json();
					setSession(newSession);
					return newSession;
				}
			}
		} catch (error) {
			console.error('Failed to parse validation response:', error);
		}
	}

	// If we reach here, both validation and refresh failed
	clearSession();
	return null;
}
