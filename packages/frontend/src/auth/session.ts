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
	if (res.ok) return session;
	// If validation fails and we have a refresh token, try to refresh
	if (session.refreshToken) {
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
	clearSession();
	return null;
}
