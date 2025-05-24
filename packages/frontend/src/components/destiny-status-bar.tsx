import React from 'react';
import type { DestinyStatus } from '@stargate/common/types/destiny';

interface DestinyStatusBarProps {
	status: DestinyStatus;
}

export const DestinyStatusBar: React.FC<DestinyStatusBarProps> = ({ status }) => {
	const inventoryDisplay = Object.entries(status.inventory).length > 0
		? Object.entries(status.inventory).map(([k, v]) => `${k}: ${v}`).join(', ')
		: 'Empty';

	return (
		<div
			style={{
				position: 'fixed',
				left: 0,
				right: 0,
				bottom: 0,
				height: '56px',
				background: 'rgba(18,20,32,0.98)',
				color: '#fff',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '0 32px',
				fontSize: '1.1rem',
				zIndex: 5001,
			}}
		>
			<div style={{ display: 'flex', gap: '2em', alignItems: 'center' }}>
				<span title="Shield">
					<b>🛡️</b> {status.shield.strength}/{status.shield.max} ({status.shield.coverage}%)
				</span>
				<span title="Power">
					<b>⚡</b> {status.power}/{status.maxPower}
				</span>
				<span title="Crew">
					<b>👨‍🚀</b> {status.crewStatus.onboard}/{status.crewStatus.capacity}
				</span>
				<span title="O₂">
					<b>O₂</b> {status.atmosphere.o2.toFixed(1)}%
				</span>
				<span title="CO₂">
					<b>CO₂</b> {status.atmosphere.co2.toFixed(2)}%
				</span>
				<span title="Scrubbers">
					<b>🧹</b> {status.atmosphere.co2Scrubbers} CO₂, {status.atmosphere.o2Scrubbers} O₂
				</span>
				<span title="Shuttles">
					<b>🛸</b> {status.shuttles.working}/{status.shuttles.total} (Damaged: {status.shuttles.damaged})
				</span>
				<span title="Weapons">
					<b>🔫</b> Main Gun: {status.weapons.mainGun ? 'Online' : 'Offline'},
					Turrets: {status.weapons.turrets.working}/{status.weapons.turrets.total}
				</span>
				<span title="Inventory">
					<b>📦</b> {inventoryDisplay}
				</span>
			</div>
		</div>
	);
};
