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
			className="fixed-bottom d-flex justify-content-between align-items-center px-4 py-2 text-white"
			style={{
				background: 'rgba(18,20,32,0.98)',
				height: '56px',
				fontSize: '1.1rem',
				zIndex: 5001,
			}}
		>
			<span title="Shield" className="d-flex align-items-center">
				<strong className="me-1">🛡️</strong>
				{status.shield.strength}/{status.shield.max} ({status.shield.coverage}%)
			</span>
			<span title="Power" className="d-flex align-items-center">
				<strong className="me-1">⚡</strong>
				{status.power}/{status.maxPower}
			</span>
			<span title="Crew" className="d-flex align-items-center">
				<strong className="me-1">👨‍🚀</strong>
				{status.crewStatus.onboard}/{status.crewStatus.capacity}
			</span>
			<span title="O₂" className="d-flex align-items-center">
				<strong className="me-1">O₂</strong>
				{status.atmosphere.o2.toFixed(1)}%
			</span>
			<span title="CO₂" className="d-flex align-items-center">
				<strong className="me-1">CO₂</strong>
				{status.atmosphere.co2.toFixed(2)}%
			</span>
			<span title="Scrubbers" className="d-flex align-items-center">
				<strong className="me-1">🧹</strong>
				{status.atmosphere.co2Scrubbers} CO₂, {status.atmosphere.o2Scrubbers} O₂
			</span>
			<span title="Shuttles" className="d-flex align-items-center">
				<strong className="me-1">🛸</strong>
				{status.shuttles.working}/{status.shuttles.total} (Damaged: {status.shuttles.damaged})
			</span>
			<span title="Weapons" className="d-flex align-items-center">
				<strong className="me-1">🔫</strong>
				Main Gun: {status.weapons.mainGun ? 'Online' : 'Offline'},
				Turrets: {status.weapons.turrets.working}/{status.weapons.turrets.total}
			</span>
			<span title="Inventory" className="d-flex align-items-center">
				<strong className="me-1">📦</strong>
				{inventoryDisplay}
			</span>
		</div>
	);
};
