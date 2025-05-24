export class MapPopover {
	static id = 'map-popover';
	static zoomLevel: 'galaxy' | 'system' | 'planet' = 'galaxy';
	static currentGalaxyId: string | null = null;
	static currentSystemId: string | null = null;
	static currentPlanetId: string | null = null;
	static gameData: any = null;
	static ship: any = null;
	static gameInstance: any = null;

	static show(gameData: any, ship: any, gameInstance?: any) {
		this.gameData = gameData;
		this.ship = ship;
		if (gameInstance) this.gameInstance = gameInstance;
		if (document.getElementById(this.id)) return;
		this.zoomLevel = 'galaxy';
		this.currentGalaxyId = null;
		this.currentSystemId = null;
		this.currentPlanetId = null;
		const pop = document.createElement('div');
		pop.id = this.id;
		pop.style.position = 'fixed';
		pop.style.top = '0';
		pop.style.left = '0';
		pop.style.width = '100vw';
		pop.style.height = '100vh';
		pop.style.background = 'rgba(24,26,40,0.98)';
		pop.style.color = '#fff';
		pop.style.padding = '0';
		pop.style.borderRadius = '0';
		pop.style.boxShadow = 'none';
		pop.style.zIndex = '5000';
		pop.style.fontSize = '1.1rem';
		pop.style.display = 'flex';
		pop.style.alignItems = 'center';
		pop.style.justifyContent = 'center';
		pop.innerHTML = this.renderGalaxyMap();
		document.body.appendChild(pop);
		this.attachHandlers();
	}

	static hide() {
		const pop = document.getElementById(this.id);
		if (pop) pop.remove();
	}

	static toggle(gameData: any, ship: any, gameInstance?: any) {
		if (document.getElementById(this.id)) {
			this.hide();
		} else {
			this.show(gameData, ship, gameInstance);
		}
	}

	static render(): string {
		if (!this.gameData) return '';
		if (this.zoomLevel === 'galaxy') {
			return this.renderGalaxyList();
		} else if (this.zoomLevel === 'system') {
			return this.renderSystemView();
		} else if (this.zoomLevel === 'planet') {
			return this.renderPlanetView();
		}
		return '';
	}

	static renderGalaxyList(): string {
		const galaxies = this.gameData.galaxies || [];
		return `
			<h2 style='margin-top:0;margin-bottom:1.2em;font-size:1.3em;'>Galaxy Map</h2>
			<div style='margin-bottom:1em;'>
				<button id='zoom-in-btn' style='margin-right:0.5em;padding:0.3em 1em;background:#333;color:#fff;border:none;border-radius:8px;font-size:1em;cursor:pointer;'>+</button>
				<button id='zoom-out-btn' style='padding:0.3em 1em;background:#333;color:#fff;border:none;border-radius:8px;font-size:1em;cursor:pointer;'>-</button>
			</div>
			<ul style='list-style:none;padding:0;margin:0;'>
				${galaxies.map((g: any) => `
					<li style='margin-bottom:1em;'>
						<a href='#' class='galaxy-link' data-id='${g.id}' style='color:#ffe066;font-weight:bold;'>${g.name}</a>
						<ul style='list-style:none;padding-left:1.2em;'>
							${(g.starSystems || []).map((s: any) => `
								<li>
									<a href='#' class='system-link' data-id='${s.id}' style='color:#66ffcc;'>${s.name}</a>
									<ul style='list-style:none;padding-left:1.2em;'>
										${(s.planets || []).map((p: any) => `
											<li><a href='#' class='planet-link' data-id='${p.id}' style='color:#aaa;'>${p.name}</a></li>
										`).join('')}
									</ul>
								</li>
							`).join('')}
						</ul>
					</li>
				`).join('')}
			</ul>
			<div style='margin-top:2em;'>
				<button id='close-map-btn' style='padding:0.5em 1.2em;background:#222;color:#fff;border:none;border-radius:8px;font-size:1em;cursor:pointer;'>Close (M)</button>
			</div>
		`;
	}

	static renderSystemView(): string {
		const galaxy = (this.gameData.galaxies || []).find((g: any) => g.id === this.currentGalaxyId);
		if (!galaxy) return '';
		const system = (galaxy.starSystems || []).find((s: any) => s.id === this.currentSystemId);
		if (!system) return '';
		return `
			<h2 style='margin-top:0;margin-bottom:1.2em;font-size:1.3em;'>System: ${system.name}</h2>
			<ul style='list-style:none;padding:0;margin:0;'>
				${(system.planets || []).map((p: any) => `
					<li><a href='#' class='planet-link' data-id='${p.id}' style='color:#aaa;'>${p.name}</a></li>
				`).join('')}
			</ul>
			<div style='margin-top:2em;'>
				<button id='zoom-out-galaxy-btn' style='padding:0.5em 1.2em;background:#222;color:#fff;border:none;border-radius:8px;font-size:1em;cursor:pointer;'>Back to Galaxy</button>
			</div>
		`;
	}

	static renderPlanetView(): string {
		const galaxy = (this.gameData.galaxies || []).find((g: any) => g.id === this.currentGalaxyId);
		if (!galaxy) return '';
		const system = (galaxy.starSystems || []).find((s: any) => s.id === this.currentSystemId);
		if (!system) return '';
		const planet = (system.planets || []).find((p: any) => p.id === this.currentPlanetId);
		if (!planet) return '';
		return `
			<h2 style='margin-top:0;margin-bottom:1.2em;font-size:1.3em;'>Planet: ${planet.name}</h2>
			<div style='margin-top:2em;'>
				<button id='zoom-out-system-btn' style='padding:0.5em 1.2em;background:#222;color:#fff;border:none;border-radius:8px;font-size:1em;cursor:pointer;'>Back to System</button>
			</div>
		`;
	}

	static renderGalaxyMap(): string {
		const galaxies = this.gameData.galaxies || [];
		const connections = this.gameData.galaxyConnections || [];
		// SVG canvas for scalable icons and lines
		const width = 1200;
		const height = 700;
		const margin = 120;
		// Compute bounds for scaling
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const g of galaxies) {
			if (g.position) {
				if (g.position.x < minX) minX = g.position.x;
				if (g.position.y < minY) minY = g.position.y;
				if (g.position.x > maxX) maxX = g.position.x;
				if (g.position.y > maxY) maxY = g.position.y;
			}
		}
		const scaleX = (width - margin * 2) / (maxX - minX || 1);
		const scaleY = (height - margin * 2) / (maxY - minY || 1);
		// Render SVG
		let svg = `<svg width='${width}' height='${height}' style='display:block;margin:auto;'>`;
		// Draw connections
		for (const conn of connections) {
			const from = galaxies.find((g: any) => g.id === conn.from);
			const to = galaxies.find((g: any) => g.id === conn.to);
			if (!from || !to) continue;
			const x1 = margin + ((from.position.x - minX) * scaleX);
			const y1 = margin + ((from.position.y - minY) * scaleY);
			const x2 = margin + ((to.position.x - minX) * scaleX);
			const y2 = margin + ((to.position.y - minY) * scaleY);
			const eligible = conn.eligible ? 'stroke="#66ffcc" stroke-width="4"' : 'stroke="#888" stroke-width="2" stroke-dasharray="6,6"';
			svg += `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' ${eligible} />`;
		}
		// Draw galaxies
		for (const g of galaxies) {
			const x = margin + ((g.position.x - minX) * scaleX);
			const y = margin + ((g.position.y - minY) * scaleY);
			const icon = this.renderGalaxyIcon(g.id, g.name);
			const reachable = g.reachable ? 'filter="url(#glow)"' : '';
			svg += `<g class='galaxy-node' data-id='${g.id}' style='cursor:pointer;'>
				<g transform='translate(${x},${y})' ${reachable}>${icon}</g>
				<text x='${x}' y='${y + 48}' text-anchor='middle' fill='#fff' font-size='18' font-weight='bold'>${g.name}</text>
			</g>`;
		}
		// SVG filter for glow effect
		svg += `<defs><filter id='glow' x='-50%' y='-50%' width='200%' height='200%'>
			<feGaussianBlur stdDeviation='6' result='coloredBlur'/>
			<feMerge>
				<feMergeNode in='coloredBlur'/>
				<feMergeNode in='SourceGraphic'/>
			</feMerge>
		</filter></defs>`;
		svg += '</svg>';
		return `
			<div style='position:absolute;top:0;left:0;width:100vw;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;'>
				<h2 style='margin-top:2em;margin-bottom:1.2em;font-size:2em;'>Galaxy Map</h2>
				${svg}
				<div style='margin-top:2em;'>
					<button id='close-map-btn' style='padding:0.7em 2em;background:#222;color:#fff;border:none;border-radius:8px;font-size:1.2em;cursor:pointer;'>Close (M)</button>
				</div>
			</div>
		`;
	}

	// Generate a unique SVG icon for each galaxy based on its id
	static renderGalaxyIcon(id: string, name: string): string {
		// Use a hash of the id to generate color/shape
		const hash = Array.from(id).reduce((acc, c) => acc + c.charCodeAt(0), 0);
		const hue = (hash * 37) % 360;
		const shapes = ['circle', 'polygon', 'ellipse', 'rect'];
		const shape = shapes[hash % shapes.length];
		const color = `hsl(${hue},80%,60%)`;
		if (shape === 'circle') {
			return `<circle r='32' cx='0' cy='0' fill='${color}' stroke='#fff' stroke-width='4' />`;
		} else if (shape === 'polygon') {
			return `<polygon points='0,-32 27,16 -27,16' fill='${color}' stroke='#fff' stroke-width='4' />`;
		} else if (shape === 'ellipse') {
			return `<ellipse rx='32' ry='20' cx='0' cy='0' fill='${color}' stroke='#fff' stroke-width='4' />`;
		} else {
			return `<rect x='-28' y='-28' width='56' height='56' rx='16' fill='${color}' stroke='#fff' stroke-width='4' />`;
		}
	}

	static attachHandlers() {
		const pop = document.getElementById(this.id);
		if (!pop) return;
		const closeBtn = pop.querySelector('#close-map-btn');
		if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
		// Add click handler for galaxy nodes
		pop.querySelectorAll('.galaxy-node').forEach(el => {
			el.addEventListener('click', (e) => {
				const id = (el as HTMLElement).getAttribute('data-id');
				if (!id) return;
				// TODO: Check eligibility and trigger jump if allowed
				// For now, just close the map
				this.hide();
			});
		});
	}

	static refresh() {
		const pop = document.getElementById(this.id);
		if (pop) pop.innerHTML = this.render();
		this.attachHandlers();
	}

	static findGalaxyIdForSystem(systemId: string): string | null {
		const galaxies = this.gameData.galaxies || [];
		for (const g of galaxies) {
			if ((g.starSystems || []).some((s: any) => s.id === systemId)) {
				return g.id;
			}
		}
		return null;
	}
}
