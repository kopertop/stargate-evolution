// Game menu overlay for Stargate Evolution
// Provides: Continue, Create Game, Load Game

import { GameSummaryListSchema } from '@stargate/common/types/game';
import { gameService } from '@stargate/db';

import { listGames, ApiError } from './api-client';
import { renderGoogleSignInButton } from './auth/google-auth';
import { getSession, setSession } from './auth/session';
import { Toast } from './toast';

export type GameSummary = typeof GameSummaryListSchema._type[number];

export class GameMenu {
	static container: HTMLDivElement | null = null;
	static games: GameSummary[] = [];
	static onStartGame: (gameId: string) => void = () => {};

	static async show(onStartGame: (gameId: string) => void) {
		if (this.container) return;
		this.onStartGame = onStartGame;
		this.container = document.createElement('div');
		this.container.id = 'game-menu-overlay';
		this.container.innerHTML = `<div class='game-menu-modal'>
			<h1>Stargate Evolution</h1>
			<div id='game-menu-buttons'>Loading...</div>
		</div>`;
		document.body.appendChild(this.container);
		this.injectStyles();
		await this.refresh();
	}

	static hide() {
		if (this.container) {
			this.container.remove();
			this.container = null;
		}
	}

	static async refresh() {
		const session = getSession();
		if (!session || !session.user) {
			this.showLoginButton();
			return;
		}
		try {
			const games = await listGames({ userId: session.user.id }, session.token) as GameSummary[];
			this.games = games;
			this.renderButtons();
		} catch (err: any) {
			if (err instanceof ApiError) {
				this.setButtons(`<p>Error loading games: ${err.message}</p>`);
			} else {
				this.setButtons('<p>Unknown error loading games.</p>');
			}
		}
	}

	static showLoginButton() {
		const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';
		this.setButtons('<p>Please sign in to access your games:</p><div id="game-menu-google-signin"></div>');

		// Wait for DOM to update before rendering the button
		setTimeout(() => {
			renderGoogleSignInButton('game-menu-google-signin', async (idToken) => {
				try {
					const res = await fetch(`${API_URL}/api/auth/google`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ idToken }),
					});
					const data = await res.json();
					if (!res.ok) throw new Error(data.error || 'Auth failed');
					Toast.show(`Welcome, ${data.user.name || data.user.email}!`, 3500);
					setSession(data);
					// Refresh the menu to show game options
					await this.refresh();
				} catch (err: any) {
					Toast.show(`Google login failed: ${err.message || err}`, 4000);
				}
			});
		}, 100);
	}

	static setButtons(html: string) {
		const btns = this.container?.querySelector('#game-menu-buttons');
		if (btns) btns.innerHTML = html;
	}

	static renderButtons() {
		const hasCurrent = this.games.some(g => g.current);
		const hasAny = this.games.length > 0;
		let html = '';
		if (hasCurrent) {
			const current = this.games.find(g => g.current)!;
			html += '<button id=\'continue-btn\'>Continue</button>';
		}
		html += '<button id=\'create-btn\'>Create Game</button>';
		if (hasAny) {
			html += '<button id=\'load-btn\'>Load Game</button>';
		}
		this.setButtons(html);
		this.attachHandlers();
	}

	static attachHandlers() {
		const continueBtn = this.container?.querySelector('#continue-btn');
		if (continueBtn) continueBtn.addEventListener('click', () => {
			const current = this.games.find(g => g.current);
			if (current) this.onStartGame(current.id);
		});
		const createBtn = this.container?.querySelector('#create-btn');
		if (createBtn) createBtn.addEventListener('click', () => this.createGame());
		const loadBtn = this.container?.querySelector('#load-btn');
		if (loadBtn) loadBtn.addEventListener('click', () => this.showLoadDialog());
	}

	static async createGame() {
		const gameId = await gameService.createNewGame();
		this.hide();
		this.onStartGame(gameId);
	}

	static showLoadDialog() {
		let html = '<h2>Load Game</h2><ul class=\'game-list\'>';
		for (const g of this.games) {
			html += `<li><button class="load-game-btn" data-id="${g.id}">${g.name}`;
			if (g.last_played) {
				html += ` <div class="date" style="padding-top: 0.5rem; font-size: 0.8rem;">Last played: ${new Date(g.last_played).toLocaleString()}</div>`;
			} else if (g.updated_at) {
				html += ` <div class="date" style="padding-top: 0.5rem; font-size: 0.8rem;">Updated: ${new Date(g.updated_at).toLocaleString()}</div>`;
			}
			html += '</button></li>';
		}
		html += '</ul><button id="back-btn">Back</button>';
		this.setButtons(html);
		const btns = this.container;
		btns?.querySelectorAll('.load-game-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
				if (id) {
					this.hide();
					this.onStartGame(id);
				}
			});
		});
		btns?.querySelector('#back-btn')?.addEventListener('click', () => this.renderButtons());
	}

	static injectStyles() {
		if (document.getElementById('game-menu-styles')) return;
		const style = document.createElement('style');
		style.id = 'game-menu-styles';
		style.textContent = `
#game-menu-overlay {
	position: fixed;
	inset: 0;
	background: rgba(10,12,24,0.92);
	z-index: 3000;
	display: flex;
	align-items: center;
	justify-content: center;
}
.game-menu-modal {
	background: #181a2a;
	border-radius: 16px;
	box-shadow: 0 4px 32px #000a;
	padding: 48px 32px 32px 32px;
	min-width: 340px;
	max-width: 90vw;
	text-align: center;
	color: #fff;
}
.game-menu-modal h1 {
	font-size: 2.2rem;
	margin-bottom: 2rem;
	letter-spacing: 0.04em;
}
#game-menu-buttons button {
	display: block;
	width: 100%;
	margin: 0.5rem 0;
	padding: 0.9rem 0;
	font-size: 1.1rem;
	background: #2a2d4a;
	color: #fff;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.2s;
}
#game-menu-buttons button:hover {
	background: #3a3d6a;
}
#game-menu-google-signin {
	margin: 1rem 0;
	display: flex;
	justify-content: center;
}
.game-list {
	list-style: none;
	padding: 0;
	margin: 1rem 0 2rem 0;
}
.game-list li {
	margin-bottom: 0.5rem;
}
.game-list .date {
	font-size: 0.9em;
	color: #aaa;
	margin-left: 1em;
}
#back-btn {
	margin-top: 1.5rem;
	background: #222;
}
`;
		document.head.appendChild(style);
	}
}
