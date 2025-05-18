import * as PIXI from 'pixi.js';

import { renderGoogleSignInButton } from './auth/google-auth';
import { getSession, setSession, validateOrRefreshSession } from './auth/session';
import { Game } from './game';
import { Toast } from './toast';

const app = new PIXI.Application();
await app.init({
	width: 800,
	height: 600,
	background: 0x10101a,
});

document.body.appendChild(app.canvas);

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

// Session persistence: check for existing session and validate/refresh
const session = await validateOrRefreshSession(API_URL);
if (session && session.user) {
	Toast.show(`Welcome back, ${session.user.name || session.user.email}!`, 3500);
	// Hide Google Sign-In button if present
	setTimeout(() => {
		const btn = document.getElementById('google-signin-btn');
		if (btn) btn.style.display = 'none';
	}, 0);
} else {
	document.body.insertAdjacentHTML(
		'beforeend',
		'<div id="google-signin-btn" style="position:fixed;top:64px;right:32px;z-index:2000;"></div>',
	);
	renderGoogleSignInButton('google-signin-btn', async (idToken) => {
		try {
			const res = await fetch(`${API_URL}/api/auth/google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Auth failed');
			Toast.show(`Welcome, ${data.user.name || data.user.email}!`, 3500);
			const btn = document.getElementById('google-signin-btn');
			if (btn) btn.style.display = 'none';
			setSession(data);
		} catch (err: any) {
			Toast.show(`Google login failed: ${err.message || err}`, 4000);
		}
	});
}

// Placeholder: Draw a simple rectangle representing the Destiny ship
const ship = new PIXI.Graphics();
ship.rect(-30, -10, 60, 20).fill(0xccccff);
ship.x = app.screen.width / 2;
ship.y = app.screen.height / 2;
app.stage.addChild(ship);

// Initialize the game loop and controls
new Game(app, ship);

declare global {
	interface ImportMeta {
		readonly env: Record<string, string>;
	}
}
