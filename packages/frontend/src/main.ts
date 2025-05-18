import * as PIXI from 'pixi.js';

import { Game } from './game';

const app = new PIXI.Application();
await app.init({
	width: 800,
	height: 600,
	background: 0x10101a,
});

document.body.appendChild(app.canvas);

// Placeholder: Draw a simple rectangle representing the Destiny ship
const ship = new PIXI.Graphics();
ship.rect(-30, -10, 60, 20).fill(0xccccff);
ship.x = app.screen.width / 2;
ship.y = app.screen.height / 2;
app.stage.addChild(ship);

// Initialize the game loop and controls
new Game(app, ship);
