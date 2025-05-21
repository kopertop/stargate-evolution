import type { DestinyStatus } from '@stargate/common/types/destiny';

export class DestinyStatusBar {
	static id = 'destiny-status-bar';

	static show(status: DestinyStatus) {
		let bar = document.getElementById(this.id) as HTMLDivElement | null;
		if (!bar) {
			bar = document.createElement('div');
			bar.id = this.id;
			bar.tabIndex = 0;
			bar.style.position = 'fixed';
			bar.style.left = '0';
			bar.style.right = '0';
			bar.style.bottom = '0';
			bar.style.height = '56px';
			bar.style.background = 'rgba(18,20,32,0.98)';
			bar.style.color = '#fff';
			bar.style.display = 'flex';
			bar.style.alignItems = 'center';
			bar.style.justifyContent = 'space-between';
			bar.style.padding = '0 32px';
			bar.style.fontSize = '1.1rem';
			bar.style.zIndex = '5001';
			document.body.appendChild(bar);
		}
		bar.innerHTML = this.render(status);
	}

	static render(status: DestinyStatus): string {
		return `
			<div style='display:flex;gap:2em;align-items:center;'>
				<span title='Shield'><b>🛡️</b> ${status.shield.strength}/${status.shield.max} (${status.shield.coverage}%)</span>
				<span title='Power'><b>⚡</b> ${status.power.current}/${status.power.max}</span>
				<span title='Crew'><b>👨‍🚀</b> ${status.crew.onboard}/${status.crew.capacity}</span>
				<span title='O₂'><b>O₂</b> ${status.atmosphere.o2.toFixed(1)}%</span>
				<span title='CO₂'><b>CO₂</b> ${status.atmosphere.co2.toFixed(2)}%</span>
				<span title='Scrubbers'><b>🧹</b> ${status.atmosphere.co2Scrubbers} CO₂, ${status.atmosphere.o2Scrubbers} O₂</span>
				<span title='Shuttles'><b>🛸</b> ${status.shuttles.working}/${status.shuttles.total} (Damaged: ${status.shuttles.damaged})</span>
				<span title='Weapons'><b>🔫</b> Main Gun: ${status.weapons.mainGun ? 'Online' : 'Offline'}, Turrets: ${status.weapons.turrets.working}/${status.weapons.turrets.total}</span>
				<span title='Inventory'><b>📦</b> ${Object.entries(status.inventory).map(([k, v]) => `${k}: ${v}`).join(', ')}</span>
			</div>
		`;
	}
}
