import { useQuery } from '@livestore/react';
import React, { useState } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import type { IconType } from 'react-icons';
import {
	GiShield,
	GiElectric,
	GiBroom,
	GiCardboardBox,
	GiTurret,
	GiInterceptorShip,
	GiGasMask,
	GiBottledBolt,
	GiHamburgerMenu,
	GiCannonShot,
} from 'react-icons/gi';
import { MdCo2 } from 'react-icons/md';
import { SiO2 } from 'react-icons/si';

import { useGameService } from '../services/use-game-service';
import type { DestinyStatus } from '../types';

import { CrewStatus } from './crew-status';

interface DestinyStatusBarProps {
	status: DestinyStatus;
}

// Simple wrapper to fix React Icons TypeScript issues
const Icon: React.FC<{ icon: IconType; size?: number; className?: string }> = ({
	icon: IconComponent,
	size = 16,
	className = '',
}) => {
	return <IconComponent size={size} className={className} />;
};

export const DestinyStatusBar: React.FC<DestinyStatusBarProps> = ({ status }) => {
	const [showInventoryDetails, setShowInventoryDetails] = useState(false);
	const [showShuttleDetails, setShowShuttleDetails] = useState(false);
	const [showWeaponsDetails, setShowWeaponsDetails] = useState(false);
	const [showAtmosphereDetails, setShowAtmosphereDetails] = useState(false);
	const [showResourcesDetails, setShowResourcesDetails] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [inventoryHoverTimeout, setInventoryHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [shuttleHoverTimeout, setShuttleHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [weaponsHoverTimeout, setWeaponsHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [atmosphereHoverTimeout, setAtmosphereHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [resourcesHoverTimeout, setResourcesHoverTimeout] = useState<NodeJS.Timeout | null>(null);

	const gameService = useGameService();
	const inventoryArr = useQuery(status.game_id ? gameService.queries.inventoryByGame(status.game_id) : gameService.queries.inventoryByGame('')) || [];
	const inventoryMap = Object.fromEntries(inventoryArr.map((i: any) => [i.resourceType, i.amount]));

	const handleInventoryMouseEnter = () => {
		if (inventoryHoverTimeout) {
			clearTimeout(inventoryHoverTimeout);
			setInventoryHoverTimeout(null);
		}
		setShowInventoryDetails(true);
	};

	const handleInventoryMouseLeave = () => {
		const timeout = setTimeout(() => {
			setShowInventoryDetails(false);
		}, 150); // Small delay to prevent flickering
		setInventoryHoverTimeout(timeout);
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

	const handleAtmosphereMouseEnter = () => {
		if (atmosphereHoverTimeout) {
			clearTimeout(atmosphereHoverTimeout);
			setAtmosphereHoverTimeout(null);
		}
		setShowAtmosphereDetails(true);
	};

	const handleAtmosphereMouseLeave = () => {
		const timeout = setTimeout(() => {
			setShowAtmosphereDetails(false);
		}, 150);
		setAtmosphereHoverTimeout(timeout);
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

	const toggleAtmosphereDetails = () => {
		setShowAtmosphereDetails(!showAtmosphereDetails);
	};

	const handleResourcesMouseEnter = () => {
		if (resourcesHoverTimeout) {
			clearTimeout(resourcesHoverTimeout);
			setResourcesHoverTimeout(null);
		}
		setShowResourcesDetails(true);
	};

	const handleResourcesMouseLeave = () => {
		const timeout = setTimeout(() => {
			setShowResourcesDetails(false);
		}, 150);
		setResourcesHoverTimeout(timeout);
	};

	const toggleResourcesDetails = () => {
		setShowResourcesDetails(!showResourcesDetails);
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
				borderTop: '1px solid #333',
			}}
		>
			<div className="d-flex justify-content-between align-items-center w-100">
				{/* Left section - Always visible critical items */}
				<Nav className="d-flex flex-row align-items-center">
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

					{/* Atmosphere Section - Critical (Always visible) */}
					<Nav.Item className="d-flex align-items-center me-3 position-relative">
						<span
							title="Atmosphere (click for details)"
							className="d-flex align-items-center"
							style={{ cursor: 'pointer' }}
							onClick={toggleAtmosphereDetails}
							onMouseEnter={handleAtmosphereMouseEnter}
							onMouseLeave={handleAtmosphereMouseLeave}
						>
							<Icon icon={SiO2} />
							<span className="me-2">
								<span className={status.atmosphere.o2 < 18 ? 'text-danger' : status.atmosphere.o2 < 20 ? 'text-warning' : 'text-success'}>
									{status.atmosphere.o2.toFixed(1)}%
								</span>
							</span>
							<Icon icon={MdCo2} />
							<span>
								<span className={status.atmosphere.co2 > 5 ? 'text-danger' : status.atmosphere.co2 > 2 ? 'text-warning' : 'text-success'}>
									{status.atmosphere.co2.toFixed(1)}%
								</span>
							</span>
						</span>

						{/* Atmosphere Details Popup */}
						{showAtmosphereDetails && (
							<div
								className="position-absolute bottom-100 start-0 mb-2 p-3 rounded shadow-lg"
								style={{
									background: 'rgba(18,20,32,0.98)',
									border: '1px solid #333',
									minWidth: '240px',
									fontSize: '0.9rem',
									zIndex: 10000,
								}}
								onMouseEnter={handleAtmosphereMouseEnter}
								onMouseLeave={handleAtmosphereMouseLeave}
							>
								<strong className="d-flex align-items-center mb-2">
									<Icon icon={GiGasMask} />
									Atmosphere Control
								</strong>
								<div className="ms-3">
									<div className="d-flex justify-content-between align-items-center">
										<span className="d-flex align-items-center">
											<Icon icon={SiO2} size={14} />
											Oxygen:
										</span>
										<span className={status.atmosphere.o2 < 18 ? 'text-danger' : status.atmosphere.o2 < 20 ? 'text-warning' : 'text-success'}>
											{status.atmosphere.o2.toFixed(1)}%
										</span>
									</div>
									<div className="d-flex justify-content-between align-items-center">
										<span className="d-flex align-items-center">
											<Icon icon={MdCo2} size={14} />
											Carbon Dioxide:
										</span>
										<span className={status.atmosphere.co2 > 5 ? 'text-danger' : status.atmosphere.co2 > 2 ? 'text-warning' : 'text-success'}>
											{status.atmosphere.co2.toFixed(1)}%
										</span>
									</div>
									<div className="mt-2 pt-2" style={{ borderTop: '1px solid #444' }}>
										<div className="d-flex justify-content-between align-items-center">
											<span className="d-flex align-items-center">
												<Icon icon={GiBroom} size={14} />
												CO₂ Scrubbers:
											</span>
											<span className={status.atmosphere.co2Scrubbers === 0 ? 'text-danger' : status.atmosphere.co2Scrubbers < 50 ? 'text-warning' : 'text-success'}>
												{status.atmosphere.co2Scrubbers}%
											</span>
										</div>
									</div>
								</div>
							</div>
						)}
					</Nav.Item>
				</Nav>

				{/* Center section - Resources (always visible on large screens) */}
				<Nav className="d-none d-lg-flex">
					<Nav.Item className="d-flex align-items-center position-relative">
						<span
							title="Resources (click for details)"
							className="d-flex align-items-center"
							style={{ cursor: 'pointer' }}
							onClick={toggleResourcesDetails}
							onMouseEnter={handleResourcesMouseEnter}
							onMouseLeave={handleResourcesMouseLeave}
						>
							<Icon icon={GiCardboardBox} />
							<span className="ms-1">Resources</span>
						</span>

						{/* Resources Details Popup */}
						{showResourcesDetails && (
							<div
								className="position-absolute bottom-100 start-50 translate-middle-x mb-2 p-3 rounded shadow-lg"
								style={{
									background: 'rgba(18,20,32,0.98)',
									border: '1px solid #333',
									minWidth: '320px',
									fontSize: '0.9rem',
									zIndex: 10000,
								}}
								onMouseEnter={handleResourcesMouseEnter}
								onMouseLeave={handleResourcesMouseLeave}
							>
								<strong className="d-flex align-items-center mb-2">
									<Icon icon={GiCardboardBox} />
									Ship Resources
								</strong>
								<div className="ms-3">
									<div className="row">
										<div className="col-6">
											<div className="d-flex justify-content-between align-items-center">
												<span>Food:</span>
												<span className={(inventoryMap.food || 0) < 10 ? 'text-danger' : (inventoryMap.food || 0) < 25 ? 'text-warning' : 'text-success'}>
													{inventoryMap.food || 0}
												</span>
											</div>
											<div className="d-flex justify-content-between align-items-center">
												<span>Water:</span>
												<span className={(inventoryMap.water || 0) < 20 ? 'text-danger' : (inventoryMap.water || 0) < 50 ? 'text-warning' : 'text-success'}>
													{inventoryMap.water || 0}
												</span>
											</div>
											<div className="d-flex justify-content-between align-items-center">
												<span>Parts:</span>
												<span className={(inventoryMap.parts || 0) < 5 ? 'text-danger' : (inventoryMap.parts || 0) < 15 ? 'text-warning' : 'text-success'}>
													{inventoryMap.parts || 0}
												</span>
											</div>
										</div>
										<div className="col-6">
											<div className="d-flex justify-content-between align-items-center">
												<span>Medicine:</span>
												<span className={(inventoryMap.medicine || 0) < 2 ? 'text-danger' : (inventoryMap.medicine || 0) < 5 ? 'text-warning' : 'text-success'}>
													{inventoryMap.medicine || 0}
												</span>
											</div>
											<div className="d-flex justify-content-between align-items-center">
												<span>Ancient Tech:</span>
												<span className="text-info">
													{inventoryMap.ancient_tech || 0}
												</span>
											</div>
											<div className="d-flex justify-content-between align-items-center">
												<span>O₂ Canisters:</span>
												<span className={(inventoryMap.oxygen_canister || 0) < 2 ? 'text-danger' : (inventoryMap.oxygen_canister || 0) < 5 ? 'text-warning' : 'text-success'}>
													{inventoryMap.oxygen_canister || 0}
												</span>
											</div>
										</div>
									</div>
									{inventoryMap.lime && (
										<div className="mt-2 pt-2" style={{ borderTop: '1px solid #444' }}>
											<div className="d-flex justify-content-between align-items-center">
												<span>Lime (CO₂ Scrubber):</span>
												<span className={(inventoryMap.lime || 0) < 5 ? 'text-danger' : (inventoryMap.lime || 0) < 15 ? 'text-warning' : 'text-success'}>
													{inventoryMap.lime || 0}
												</span>
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</Nav.Item>
				</Nav>

				{/* Right section - Toggle and collapsible items */}
				<div className="d-flex align-items-center">
					{/* Toggle button for smaller screens */}
					<Navbar.Toggle
						aria-controls="status-navbar-nav"
						className="border-0 p-1"
						style={{ boxShadow: 'none' }}
					>
						<Icon icon={GiHamburgerMenu} size={20} />
					</Navbar.Toggle>
				</div>
			</div>

			{/* Collapsible secondary items */}
			<Navbar.Collapse id="status-navbar-nav">
				<Nav className="ms-auto d-flex flex-row align-items-center">
					{/* Crew Status */}
					<CrewStatus
						game_id={status.game_id}
					/>

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
									zIndex: 10000,
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
										<span className="d-inline">
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
									zIndex: 10000,
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

					{/* Inventory Section - At the end */}
					<Nav.Item className="d-flex align-items-center position-relative">
						<span
							title="Inventory (click for details)"
							className="d-flex align-items-center"
							style={{ cursor: 'pointer' }}
							onClick={toggleInventoryDetails}
							onMouseEnter={handleInventoryMouseEnter}
							onMouseLeave={handleInventoryMouseLeave}
						>
							<Icon icon={GiCardboardBox} />
							<span className="d-none d-sm-inline">Supplies</span>
						</span>

						{/* Inventory Details Popup */}
						{showInventoryDetails && (
							<div
								className="position-absolute bottom-100 end-0 mb-2 p-3 rounded shadow-lg"
								style={{
									background: 'rgba(18,20,32,0.98)',
									border: '1px solid #333',
									minWidth: '280px',
									fontSize: '0.9rem',
									zIndex: 10000,
								}}
								onMouseEnter={handleInventoryMouseEnter}
								onMouseLeave={handleInventoryMouseLeave}
							>
								<div>
									<strong className="d-flex align-items-center mb-2">
										<Icon icon={GiBottledBolt} />
										Inventory
									</strong>
									<div className="ms-3">
										{Object.entries(inventoryMap).length > 0 ? (
											Object.entries(inventoryMap).map(([resource, amount]) => {
												const numAmount = Number(amount);
												return (
													<div key={resource} className="d-flex justify-content-between">
														<span style={{ textTransform: 'capitalize' }}>
															{resource.replace('_', ' ')}:
														</span>
														<span className={numAmount === 0 ? 'text-danger' : numAmount < 5 ? 'text-warning' : 'text-light'}>
															{numAmount}
														</span>
													</div>
												);
											})
										) : (
											<div className="text-muted">Empty</div>
										)}
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
