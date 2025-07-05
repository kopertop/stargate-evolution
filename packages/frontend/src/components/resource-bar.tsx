import React from 'react';
import { Container, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
	FaBolt,
	FaShieldAlt,
	FaHeart,
	FaTint,
	FaUtensils,
	FaCog,
	FaMedkit,
	FaClock,
	FaRocket,
	FaUsers,
	FaCloud,
	FaLeaf,
	FaPause,
} from 'react-icons/fa';

interface ResourceBarProps {
  power: number;
  maxPower: number;
  shields: number;
  maxShields: number;
  hull: number;
  maxHull: number;
  water: number;
  maxWater: number;
  food: number;
  maxFood: number;
  spareParts: number;
  maxSpareParts: number;
  medicalSupplies: number;
  maxMedicalSupplies: number;
  co2: number;
  o2: number;
  ftlStatus: string;
  nextFtlTransition: number;
  timeSpeed: number;
  characterCount: number;
  currentTime?: number; // Seconds since game start
  onTimeSpeedChange?: (newSpeed: number) => void; // Optional click handler for time speed
  onShowPause?: () => void; // Optional pause menu handler
}

interface ResourceItemProps {
  icon: React.ReactNode;
  current: number;
  max?: number;
  label: string;
  color: string;
  format?: 'percentage' | 'number' | 'time';
}

const ResourceItem: React.FC<ResourceItemProps> = ({
	icon,
	current,
	max,
	label,
	color,
	format = 'number',
}) => {
	const getDisplayValue = () => {
		if (format === 'percentage' && max) {
			return `${Math.round((current / max) * 100)}%`;
		}
		if (format === 'time') {
			const days = Math.floor(current / 86400);
			const hours = Math.floor(current % 86400 / 3600);
			const minutes = Math.floor(current % 3600 / 60);
			const seconds = Math.floor(current % 60);
			return `${days}d ${hours}h ${minutes}m ${seconds}s`;
		}
		if (max) {
			return `${current}/${max}`;
		}
		return current.toString();
	};

	const getColorStyle = () => {
		if (max && format === 'percentage') {
			const percentage = (current / max) * 100;
			if (percentage < 25) return '#dc3545'; // danger
			if (percentage < 50) return '#fd7e14'; // warning
			return color;
		}
		return color;
	};

	const getTooltipContent = () => {
		if (format === 'percentage' && max) {
			const percentage = Math.round((current / max) * 100);
			return `${label}: ${current}/${max} (${percentage}%)`;
		}
		if (format === 'time') {
			const days = Math.floor(current / 24);
			const hours = Math.floor(current % 24);
			const minutes = Math.floor((current % 1) * 60);
			const seconds = Math.floor(((current % 1) * 60 % 1) * 60);
			return `${label}: Day ${days}, Hour ${hours}, Minute ${minutes}, Second ${seconds}`;
		}
		if (max) {
			return `${label}: ${current} of ${max} available`;
		}
		return `${label}: ${current}`;
	};

	const tooltip = (
		<Tooltip id={`tooltip-${label.replace(/\s+/g, '-').toLowerCase()}`}>
			{getTooltipContent()}
		</Tooltip>
	);

	return (
		<OverlayTrigger
			placement="bottom"
			delay={{ show: 250, hide: 150 }}
			overlay={tooltip}
		>
			<div
				className="d-flex align-items-center me-3"
				style={{ fontSize: '0.9rem', cursor: 'help' }}
			>
				<span style={{ color: getColorStyle(), marginRight: '4px' }}>
					{icon}
				</span>
				<span style={{ color: getColorStyle(), fontWeight: '500' }}>
					{getDisplayValue()}
				</span>
			</div>
		</OverlayTrigger>
	);
};

export const ResourceBar: React.FC<ResourceBarProps> = ({
	power,
	maxPower,
	shields,
	maxShields,
	hull,
	maxHull,
	water,
	maxWater,
	food,
	maxFood,
	spareParts,
	maxSpareParts,
	medicalSupplies,
	maxMedicalSupplies,
	co2,
	o2,
	ftlStatus,
	nextFtlTransition,
	timeSpeed,
	characterCount,
	currentTime,
	onTimeSpeedChange,
	onShowPause,
}) => {
	// Handle time speed cycling when clicked
	const handleTimeSpeedClick = () => {
		if (onTimeSpeedChange) {
			const speeds = [0, 1, 60, 1800, 3600]; // 0x (pause), 1x (real-time), 1 min/sec, 30 min/sec, 1 hr/sec
			const currentIndex = speeds.indexOf(timeSpeed);
			const nextIndex = (currentIndex + 1) % speeds.length;
			onTimeSpeedChange(speeds[nextIndex]);
		}
	};

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				background: 'rgba(0, 0, 0, 0.8)',
				backdropFilter: 'blur(10px)',
				borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
				padding: '8px 16px',
				zIndex: 1000,
				color: 'white',
			}}
		>
			<Container fluid>
				<Row className="align-items-center">
					<Col xs="auto">
						<div className="d-flex align-items-center flex-wrap">
							{/* Pause Menu Button */}
							{onShowPause && (
								<OverlayTrigger
									placement="bottom"
									delay={{ show: 250, hide: 150 }}
									overlay={
										<Tooltip id="pause-menu-tooltip">
											Pause Game
										</Tooltip>
									}
								>
									<div
										className="d-flex align-items-center me-3"
										onClick={onShowPause}
										style={{
											fontSize: '1rem',
											cursor: 'pointer',
											padding: '6px 8px',
											borderRadius: '4px',
											background: 'rgba(108, 117, 125, 0.1)',
											border: '1px solid #6c757d',
											transition: 'all 0.2s ease',
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.background = 'rgba(108, 117, 125, 0.2)';
											e.currentTarget.style.transform = 'scale(1.05)';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background = 'rgba(108, 117, 125, 0.1)';
											e.currentTarget.style.transform = 'scale(1)';
										}}
									>
										<span style={{ color: '#6c757d' }}>
											<FaPause />
										</span>
									</div>
								</OverlayTrigger>
							)}

							{/* Power & Critical Systems */}
							<ResourceItem
								icon={<FaBolt />}
								current={power}
								max={maxPower}
								label="Power"
								color="#ffc107"
								format="percentage"
							/>

							<ResourceItem
								icon={<FaShieldAlt />}
								current={shields}
								max={maxShields}
								label="Shields"
								color="#17a2b8"
								format="percentage"
							/>

							<ResourceItem
								icon={<FaHeart />}
								current={hull}
								max={maxHull}
								label="Hull Integrity"
								color="#dc3545"
								format="percentage"
							/>

							{/* Life Support */}
							<ResourceItem
								icon={<FaLeaf />}
								current={o2}
								label="Oxygen"
								color="#28a745"
							/>

							<ResourceItem
								icon={<FaCloud />}
								current={co2}
								label="CO2"
								color="#6c757d"
							/>

							{/* Resources */}
							<ResourceItem
								icon={<FaTint />}
								current={water}
								max={maxWater}
								label="Water"
								color="#17a2b8"
								format="percentage"
							/>

							<ResourceItem
								icon={<FaUtensils />}
								current={food}
								max={maxFood}
								label="Food"
								color="#fd7e14"
								format="percentage"
							/>

							<ResourceItem
								icon={<FaCog />}
								current={spareParts}
								max={maxSpareParts}
								label="Spare Parts"
								color="#6c757d"
								format="percentage"
							/>

							<ResourceItem
								icon={<FaMedkit />}
								current={medicalSupplies}
								max={maxMedicalSupplies}
								label="Medical Supplies"
								color="#dc3545"
								format="percentage"
							/>
						</div>
					</Col>

					<Col xs="auto" className="ms-auto">
						<div className="d-flex align-items-center">
							{/* Crew */}
							<ResourceItem
								icon={<FaUsers />}
								current={characterCount}
								label="Crew"
								color="#6f42c1"
							/>

							{/* Time */}
							<ResourceItem
								icon={<FaClock />}
								current={currentTime ?? 0}
								label="Mission Time"
								color="#20c997"
								format="time"
							/>

							{/* FTL Status & Countdown Clock */}
							<OverlayTrigger
								placement="bottom"
								delay={{ show: 250, hide: 150 }}
								overlay={
									<Tooltip id="ftl-status-tooltip">
										{ftlStatus === 'ftl'
											? `Ship in hyperspace. Dropping to normal space in ${Math.floor(nextFtlTransition)}h ${Math.round((nextFtlTransition % 1) * 60)}m.`
											: `Ship in normal space. ${nextFtlTransition > 0 ? `Next FTL jump in ${Math.floor(nextFtlTransition)}h ${Math.round((nextFtlTransition % 1) * 60)}m.` : 'Ready for FTL jump.'}`
										}
									</Tooltip>
								}
							>
								<div
									className="d-flex align-items-center me-3"
									style={{
										fontSize: '0.9rem',
										cursor: 'help',
										padding: '4px 8px',
										borderRadius: '4px',
										background: ftlStatus === 'ftl'
											? 'rgba(0, 123, 255, 0.1)'
											: 'rgba(40, 167, 69, 0.1)',
										border: `1px solid ${ftlStatus === 'ftl' ? '#007bff' : '#28a745'}`,
									}}
								>
									<span style={{
										color: ftlStatus === 'ftl' ? '#007bff' : '#28a745',
										marginRight: '6px',
										fontSize: '1rem',
									}}>
										<FaRocket />
									</span>
									<div className="d-flex flex-column align-items-start">
										<span style={{
											color: ftlStatus === 'ftl' ? '#007bff' : '#28a745',
											fontWeight: '600',
											fontSize: '0.85rem',
											lineHeight: '1',
										}}>
											{ftlStatus === 'ftl' ? 'HYPERSPACE' : 'NORMAL SPACE'}
										</span>
										{nextFtlTransition > 0 && (
											<span style={{
												color: '#ffc107',
												fontSize: '0.75rem',
												fontWeight: '500',
												lineHeight: '1',
											}}>
												{ftlStatus === 'ftl' ? 'EXIT: ' : 'JUMP: '}
												{Math.floor(nextFtlTransition)}h {Math.round((nextFtlTransition % 1) * 60)}m
											</span>
										)}
									</div>
								</div>
							</OverlayTrigger>

							{/* Time Speed Display */}
							<OverlayTrigger
								placement="bottom"
								delay={{ show: 250, hide: 150 }}
								overlay={
									<Tooltip id="time-speed-tooltip">
                    Time flows at {timeSpeed}x normal speed. Use LB/RB or click here to adjust speed.
									</Tooltip>
								}
							>
								<div
									className="d-flex align-items-center"
									onClick={handleTimeSpeedClick}
									style={{
										fontSize: '0.9rem',
										cursor: onTimeSpeedChange ? 'pointer' : 'help',
										padding: '4px 8px',
										borderRadius: '4px',
										background: timeSpeed === 0
											? 'rgba(255, 193, 7, 0.1)'
											: timeSpeed === 1
												? 'rgba(40, 167, 69, 0.1)'
												: 'rgba(13, 110, 253, 0.1)',
										border: `1px solid ${
											timeSpeed === 0
												? '#ffc107'
												: timeSpeed === 1
													? '#28a745'
													: '#007bff'
										}`,
									}}
								>
									<span style={{
										color: timeSpeed === 0
											? '#ffc107'
											: timeSpeed === 1
												? '#28a745'
												: '#007bff',
										marginRight: '6px',
										fontSize: '1rem',
									}}>
										<FaClock />
									</span>
									<div className="d-flex flex-column align-items-start">
										<span style={{
											color: timeSpeed === 0
												? '#ffc107'
												: timeSpeed === 1
													? '#28a745'
													: '#007bff',
											fontWeight: '600',
											fontSize: '0.85rem',
											lineHeight: '1',
										}}>
											{timeSpeed === 0 ? 'PAUSED' : `${timeSpeed}x SPEED`}
										</span>
										<span style={{
											color: '#aaa',
											fontSize: '0.7rem',
											fontWeight: '400',
											lineHeight: '1',
										}}>
											{timeSpeed === 0
												? 'Time stopped'
												: `${timeSpeed} min/sec`
											}
										</span>
									</div>
								</div>
							</OverlayTrigger>
						</div>
					</Col>
				</Row>
			</Container>
		</div>
	);
};
