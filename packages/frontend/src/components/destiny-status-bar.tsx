import React, { useState } from 'react';
import { Navbar, Nav, Navbar as BSNavbar } from 'react-bootstrap';
import type { DestinyStatus } from '@stargate/common/types/destiny';
import type { IconType } from 'react-icons';
import {
	GiShield,
	GiElectric,
	GiMeeple,
	GiBroom,
	GiCardboardBox,
	GiTurret,
	GiInterceptorShip,
	GiGasMask,
	GiBottledBolt,
	GiHamburgerMenu,
	GiCannonShot
} from 'react-icons/gi';

interface DestinyStatusBarProps {
	status: DestinyStatus;
}

// Simple wrapper to fix React Icons TypeScript issues
const Icon: React.FC<{ icon: IconType; size?: number; className?: string }> = ({
	icon: IconComponent,
	size = 16,
	className = ''
}) => {
	return <IconComponent size={size} className={className} />;
};

export const DestinyStatusBar: React.FC<DestinyStatusBarProps> = ({ status }) => {
	const [showInventoryDetails, setShowInventoryDetails] = useState(false);
	const [showShuttleDetails, setShowShuttleDetails] = useState(false);
	const [showWeaponsDetails, setShowWeaponsDetails] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [shuttleHoverTimeout, setShuttleHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [weaponsHoverTimeout, setWeaponsHoverTimeout] = useState<NodeJS.Timeout | null>(null);

	const handleMouseEnter = () => {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			setHoverTimeout(null);
		}
		setShowInventoryDetails(true);
	};

	const handleMouseLeave = () => {
		const timeout = setTimeout(() => {
			setShowInventoryDetails(false);
		}, 150); // Small delay to prevent flickering
		setHoverTimeout(timeout);
	};

	const handleShuttleMouseEnter = () => {
		if (shuttleHoverTimeout) {
			clearTimeout(shuttleHoverTimeout);
			setShuttleHoverTimeout(null);
		}
		setShowShuttleDetails(true);
	};

	const handleShuttleMouseLeave = () => {
		const timeout = setTimeout(() => {
			setShowShuttleDetails(false);
		}, 150);
		setShuttleHoverTimeout(timeout);
	};

	const handleWeaponsMouseEnter = () => {
		if (weaponsHoverTimeout) {
			clearTimeout(weaponsHoverTimeout);
			setWeaponsHoverTimeout(null);
		}
		setShowWeaponsDetails(true);
	};

	const handleWeaponsMouseLeave = () => {
		const timeout = setTimeout(() => {
			setShowWeaponsDetails(false);
		}, 150);
		setWeaponsHoverTimeout(timeout);
	};

	const toggleInventoryDetails = () => {
		setShowInventoryDetails(!showInventoryDetails);
	};

	const toggleShuttleDetails = () => {
		setShowShuttleDetails(!showShuttleDetails);
	};

	const toggleWeaponsDetails = () => {
		setShowWeaponsDetails(!showWeaponsDetails);
	};

	// Calculate weapons summary
	const getWeaponsSummary = () => {
		const mainGunActive = status.weapons.mainGun ? 1 : 0;
		const turretsActive = status.weapons.turrets.working;
		const totalActive = mainGunActive + turretsActive;
		const totalWeapons = 1 + status.weapons.turrets.total; // 1 main gun + total turrets
		return { totalActive, totalWeapons };
	};

	return (
		<Navbar
			fixed="bottom"
			expand="lg"
			expanded={expanded}
			onToggle={setExpanded}
			className="px-3 py-2 text-white"
			style={{
				background: 'rgba(18,20,32,0.98)',
				minHeight: '56px',
				fontSize: '1.1rem',
				zIndex: 5001,
				borderTop: '1px solid #333'
			}}
		>
			{/* Always visible critical items */}
			<Nav className="me-auto d-flex flex-row align-items-center">
				{/* Shield Status - Critical */}
				<Nav.Item className="d-flex align-items-center me-3">
					<Icon icon={GiShield} />
					<span title="Shield" className="d-none d-sm-inline">
						{status.shield.strength}/{status.shield.max}
					</span>
					<span title="Shield" className="d-sm-none">
						{status.shield.strength}
					</span>
				</Nav.Item>

				{/* Power Status - Critical */}
				<Nav.Item className="d-flex align-items-center me-3">
					<Icon icon={GiElectric} />
					<span title="Power">
						{status.power}/{status.maxPower}
					</span>
				</Nav.Item>

				{/* Combined Inventory & Atmosphere Section - Critical */}
				<Nav.Item className="d-flex align-items-center me-3 position-relative">
					<span
						title="Inventory & Atmosphere (click for details)"
						className="d-flex align-items-center"
						style={{ cursor: 'pointer' }}
						onClick={toggleInventoryDetails}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						<Icon icon={GiCardboardBox} />
						<span className="d-none d-sm-inline">Supplies</span>
					</span>

					{/* Inventory Details Popup */}
					{showInventoryDetails && (
						<div
							className="position-absolute bottom-100 start-0 mb-2 p-3 rounded shadow-lg"
							style={{
								background: 'rgba(18,20,32,0.98)',
								border: '1px solid #333',
								minWidth: '280px',
								fontSize: '0.9rem',
								zIndex: 10000
							}}
							onMouseEnter={handleMouseEnter}
							onMouseLeave={handleMouseLeave}
						>
							<div className="mb-2">
								<strong className="d-flex align-items-center mb-2">
									<Icon icon={GiGasMask} />
									Atmosphere
								</strong>
								<div className="ms-3">
									<div className="d-flex justify-content-between">
										<span>O₂:</span>
										<span className={status.atmosphere.o2 < 18 ? 'text-danger' : status.atmosphere.o2 < 20 ? 'text-warning' : 'text-success'}>
											{status.atmosphere.o2.toFixed(1)}%
										</span>
									</div>
									<div className="d-flex justify-content-between">
										<span>CO₂:</span>
										<span className={status.atmosphere.co2 > 5 ? 'text-danger' : status.atmosphere.co2 > 2 ? 'text-warning' : 'text-success'}>
											{status.atmosphere.co2.toFixed(2)}%
										</span>
									</div>
								</div>
							</div>

							<div>
								<strong className="d-flex align-items-center mb-2">
									<Icon icon={GiBottledBolt} />
									Inventory
								</strong>
								<div className="ms-3">
									{Object.entries(status.inventory).length > 0 ? (
										Object.entries(status.inventory).map(([resource, amount]) => (
											<div key={resource} className="d-flex justify-content-between">
												<span style={{ textTransform: 'capitalize' }}>
													{resource.replace('_', ' ')}:
												</span>
												<span className={amount === 0 ? 'text-danger' : amount < 5 ? 'text-warning' : 'text-light'}>
													{amount}
												</span>
											</div>
										))
									) : (
										<div className="text-muted">Empty</div>
									)}
								</div>
							</div>
						</div>
					)}
				</Nav.Item>
			</Nav>

			{/* Toggle button for smaller screens */}
			<Navbar.Toggle
				aria-controls="status-navbar-nav"
				className="border-0 p-1"
				style={{ boxShadow: 'none' }}
			>
				<Icon icon={GiHamburgerMenu} size={20} />
			</Navbar.Toggle>

			{/* Collapsible secondary items */}
			<Navbar.Collapse id="status-navbar-nav">
				<Nav className="ms-auto d-flex flex-row align-items-center">
					{/* Crew Status */}
					<Nav.Item className="d-flex align-items-center me-3">
						<Icon icon={GiMeeple} />
						<span title="Crew">
							{status.crewStatus.onboard}/{status.crewStatus.capacity}
						</span>
					</Nav.Item>

					{/* Scrubbers Status */}
					<Nav.Item className="d-flex align-items-center me-3">
						<Icon icon={GiBroom} />
						<span title="Scrubbers" className="d-none d-md-inline">
							{status.atmosphere.co2Scrubbers} CO₂, {status.atmosphere.o2Scrubbers} O₂
						</span>
						<span title="Scrubbers" className="d-md-none">
							{status.atmosphere.co2Scrubbers + status.atmosphere.o2Scrubbers}
						</span>
					</Nav.Item>

					{/* Shuttles Section with Details on Hover */}
					<Nav.Item className="d-flex align-items-center me-3 position-relative">
						<span
							title="Shuttles (click for details)"
							className="d-flex align-items-center"
							style={{ cursor: 'pointer' }}
							onClick={toggleShuttleDetails}
							onMouseEnter={handleShuttleMouseEnter}
							onMouseLeave={handleShuttleMouseLeave}
						>
							<Icon icon={GiInterceptorShip} />
							{status.shuttles.working}/{status.shuttles.total}
						</span>

						{/* Shuttle Details Popup */}
						{showShuttleDetails && (
							<div
								className="position-absolute bottom-100 end-0 mb-2 p-3 rounded shadow-lg"
								style={{
									background: 'rgba(18,20,32,0.98)',
									border: '1px solid #333',
									minWidth: '200px',
									fontSize: '0.9rem',
									zIndex: 10000
								}}
								onMouseEnter={handleShuttleMouseEnter}
								onMouseLeave={handleShuttleMouseLeave}
							>
								<strong className="d-flex align-items-center mb-2">
									<Icon icon={GiInterceptorShip} />
									Shuttle Bay
								</strong>
								<div className="ms-3">
									<div className="d-flex justify-content-between">
										<span>Working:</span>
										<span className={status.shuttles.working === 0 ? 'text-danger' : 'text-success'}>
											{status.shuttles.working}
										</span>
									</div>
									<div className="d-flex justify-content-between">
										<span>Total:</span>
										<span className="text-light">
											{status.shuttles.total}
										</span>
									</div>
									{status.shuttles.damaged > 0 && (
										<div className="d-flex justify-content-between">
											<span>Damaged:</span>
											<span className="text-warning">
												{status.shuttles.damaged}
											</span>
										</div>
									)}
								</div>
							</div>
						)}
					</Nav.Item>

					{/* Weapons Status */}
					<Nav.Item className="d-flex align-items-center me-3 position-relative">
						<span
							title="Weapons (click for details)"
							className="d-flex align-items-center"
							style={{ cursor: 'pointer' }}
							onClick={toggleWeaponsDetails}
							onMouseEnter={handleWeaponsMouseEnter}
							onMouseLeave={handleWeaponsMouseLeave}
						>
							<Icon icon={GiTurret} />
							{(() => {
								const { totalActive, totalWeapons } = getWeaponsSummary();
								return (
									<>
										<span className="d-none d-lg-inline">
											{totalActive}/{totalWeapons} Weapons
										</span>
										<span className="d-lg-none">
											{totalActive}/{totalWeapons}
										</span>
									</>
								);
							})()}
						</span>

						{/* Weapons Details Popup */}
						{showWeaponsDetails && (
							<div
								className="position-absolute bottom-100 end-0 mb-2 p-3 rounded shadow-lg"
								style={{
									background: 'rgba(18,20,32,0.98)',
									border: '1px solid #333',
									minWidth: '240px',
									fontSize: '0.9rem',
									zIndex: 10000
								}}
								onMouseEnter={handleWeaponsMouseEnter}
								onMouseLeave={handleWeaponsMouseLeave}
							>
								<strong className="d-flex align-items-center mb-2">
									<Icon icon={GiTurret} />
									Weapons Array
								</strong>
								<div className="ms-3">
									<div className="d-flex justify-content-between align-items-center">
										<span className="d-flex align-items-center">
											<Icon icon={GiCannonShot} size={14} />
											Main Gun:
										</span>
										<span className={status.weapons.mainGun ? 'text-success' : 'text-danger'}>
											{status.weapons.mainGun ? 'Online' : 'Offline'}
										</span>
									</div>
									<div className="d-flex justify-content-between align-items-center">
										<span className="d-flex align-items-center">
											<Icon icon={GiTurret} size={14} />
											Turrets Active:
										</span>
										<span className={status.weapons.turrets.working === 0 ? 'text-danger' : 'text-success'}>
											{status.weapons.turrets.working}
										</span>
									</div>
									<div className="d-flex justify-content-between align-items-center">
										<span className="d-flex align-items-center">
											<Icon icon={GiTurret} size={14} />
											Turrets Total:
										</span>
										<span className="text-light">
											{status.weapons.turrets.total}
										</span>
									</div>
									{status.weapons.turrets.total > status.weapons.turrets.working && (
										<div className="d-flex justify-content-between align-items-center">
											<span className="d-flex align-items-center">
												<Icon icon={GiTurret} size={14} />
												Turrets Damaged:
											</span>
											<span className="text-warning">
												{status.weapons.turrets.total - status.weapons.turrets.working}
											</span>
										</div>
									)}
									{/* Future weapon types can be added here */}
									<div className="mt-2 pt-2" style={{ borderTop: '1px solid #444' }}>
										<small className="text-muted d-flex align-items-center">
											<Icon icon={GiTurret} size={12} />
											Ready for: Missiles • Rail Guns • Energy Weapons
										</small>
									</div>
								</div>
							</div>
						)}
					</Nav.Item>
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
};
