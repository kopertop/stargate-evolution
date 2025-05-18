import * as PIXI from 'pixi.js';

const SHIP_SPEED = 4;
const STAR_COUNT = 200;
const STAR_COLOR = 0xffffff;
const STAR_RADIUS = 1.5;

export class Game {
	private app: PIXI.Application;
	private ship: PIXI.Graphics;
	private keys: Record<string, boolean> = {};
	private starfield: PIXI.Graphics;
	private world: PIXI.Container;

	constructor(app: PIXI.Application, ship: PIXI.Graphics) {
		this.app = app;
		this.world = new PIXI.Container();
		this.starfield = this.createStarfield();
		this.ship = ship;
		this.world.addChild(this.starfield);
		this.world.addChild(this.ship);
		this.app.stage.addChild(this.world);
		this.setupInput();
		this.resizeToWindow();
		window.addEventListener('resize', () => this.resizeToWindow());
		this.app.ticker.add(() => this.update());
	}

	private createStarfield(): PIXI.Graphics {
		const g = new PIXI.Graphics();
		for (let i = 0; i < STAR_COUNT; i++) {
			const x = Math.random() * 4000 - 2000;
			const y = Math.random() * 4000 - 2000;
			g.circle(x, y, STAR_RADIUS).fill(STAR_COLOR);
		}
		return g;
	}

	private setupInput() {
		window.addEventListener('keydown', (e) => {
			this.keys[e.key.toLowerCase()] = true;
		});
		window.addEventListener('keyup', (e) => {
			this.keys[e.key.toLowerCase()] = false;
		});
	}

	private resizeToWindow() {
		this.app.renderer.resize(window.innerWidth, window.innerHeight);
	}

	private update() {
		let dx = 0, dy = 0;
		if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
		if (this.keys['arrowdown'] || this.keys['s']) dy += 1;
		if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
		if (this.keys['arrowright'] || this.keys['d']) dx += 1;
		if (dx !== 0 || dy !== 0) {
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			dx /= len;
			dy /= len;
			this.ship.x += dx * SHIP_SPEED;
			this.ship.y += dy * SHIP_SPEED;
		}
		// Center camera on ship
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;
		this.world.x = centerX - this.ship.x;
		this.world.y = centerY - this.ship.y;
	}
}
