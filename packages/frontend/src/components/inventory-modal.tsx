import { DestinyStatus, Character } from '@stargate/common';
import React, { useState } from 'react';
import { Modal, Container, Row, Col, Card, ProgressBar, Badge, Table, Nav, ButtonGroup, Button } from 'react-bootstrap';
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
	FaWrench,
	FaFlask,
	FaBroadcastTower,
	FaDatabase,
	FaMapMarkerAlt,
	FaPlay,
	FaPause,
	FaFastForward,
	FaStepForward,
} from 'react-icons/fa';

interface InventoryModalProps {
  show: boolean;
  onHide: () => void;
  destinyStatus: DestinyStatus;
  characters: Character[];
  technologies: string[];
  exploredRooms: string[];
  focusedTab: number;
  onTabChange: (tabIndex: number) => void;
  onStartFTLJump?: (hours: number) => void;
  onExitFTL?: () => void;
  onSetTimeSpeed?: (speed: number) => void;
}

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  current: number;
  max?: number;
  color: string;
  description: string;
  format?: 'percentage' | 'number' | 'time';
}

const ResourceCard: React.FC<ResourceCardProps> = ({ 
	icon, 
	title, 
	current, 
	max, 
	color, 
	description,
	format = 'number', 
}) => {
	const getPercentage = () => {
		if (!max) return 100;
		return Math.round((current / max) * 100);
	};

	const getVariant = () => {
		const percentage = getPercentage();
		if (percentage < 25) return 'danger';
		if (percentage < 50) return 'warning';
		return 'success';
	};

	const getDisplayValue = () => {
		if (format === 'time') {
			const days = Math.floor(current / 24);
			const hours = current % 24;
			return `${days} days, ${hours} hours`;
		}
		if (max) {
			return `${current} / ${max}`;
		}
		return current.toString();
	};

	return (
		<Card className="h-100" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
			<Card.Body>
				<div className="d-flex align-items-center mb-2">
					<span style={{ color, fontSize: '1.2rem', marginRight: '8px' }}>
						{icon}
					</span>
					<Card.Title style={{ color: 'white', margin: 0, fontSize: '1rem' }}>
						{title}
					</Card.Title>
				</div>
        
				{max && (
					<ProgressBar 
						variant={getVariant()} 
						now={getPercentage()} 
						className="mb-2"
						style={{ height: '8px' }}
					/>
				)}
        
				<div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
					{getDisplayValue()}
				</div>
        
				{max && (
					<div style={{ color: color, fontSize: '0.9rem' }}>
						{getPercentage()}%
					</div>
				)}
        
				<div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '8px' }}>
					{description}
				</div>
			</Card.Body>
		</Card>
	);
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
	show,
	onHide,
	destinyStatus,
	characters,
	technologies,
	exploredRooms,
	focusedTab,
	onTabChange,
	onStartFTLJump,
	onExitFTL,
	onSetTimeSpeed,
}) => {
	const tabs = [
		{ key: 'systems', label: 'Ship Systems', icon: <FaRocket /> },
		{ key: 'resources', label: 'Resources', icon: <FaDatabase /> },
		{ key: 'crew', label: 'Crew', icon: <FaUsers /> },
		{ key: 'technology', label: 'Technology', icon: <FaFlask /> },
		{ key: 'exploration', label: 'Exploration', icon: <FaMapMarkerAlt /> },
	];

	const renderSystemsTab = () => {
		// Calculate time values for display
		const timeToJump = Math.max(0, destinyStatus.next_jump_time - destinyStatus.current_time);
		const timeToJumpHours = Math.floor(timeToJump / 60);
		const timeToJumpMinutes = Math.round(timeToJump % 60);
    
		const currentTimeHours = Math.floor(destinyStatus.current_time / 60);
		const currentTimeDays = Math.floor(currentTimeHours / 24);
		const currentTimeDisplayHours = currentTimeHours % 24;
		const currentTimeDisplayMinutes = Math.round(destinyStatus.current_time % 60);

		return (
			<div>
				{/* Countdown Clock & Time Controls - First Priority Section */}
				<div style={{ marginBottom: '2rem' }}>
					<h6 style={{ color: 'white', marginBottom: '1rem', borderBottom: '2px solid #007bff', paddingBottom: '0.5rem' }}>
						<FaClock style={{ marginRight: '8px', color: '#007bff' }} />
            Mission Time & FTL Status
					</h6>
          
					<Row>
						<Col lg={6} className="mb-3">
							<Card className="h-100" style={{ 
								background: 'rgba(13, 110, 253, 0.1)', 
								border: '2px solid #007bff',
								borderRadius: '12px',
							}}>
								<Card.Body>
									<div className="text-center">
										<div style={{ color: '#007bff', fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>
                      Current Mission Time
										</div>
										<div style={{ 
											color: 'white', 
											fontSize: '1.8rem', 
											fontWeight: 'bold',
											marginBottom: '4px',
											fontFamily: 'monospace',
										}}>
                      Day {currentTimeDays} • {String(currentTimeDisplayHours).padStart(2, '0')}:{String(currentTimeDisplayMinutes).padStart(2, '0')}
										</div>
										<div style={{ color: '#aaa', fontSize: '0.85rem' }}>
											{destinyStatus.current_time.toLocaleString()} minutes elapsed
										</div>
									</div>
								</Card.Body>
							</Card>
						</Col>
            
						<Col lg={6} className="mb-3">
							<Card className="h-100" style={{ 
								background: destinyStatus.ftl_status === 'ftl' 
									? 'rgba(13, 110, 253, 0.1)' 
									: 'rgba(40, 167, 69, 0.1)', 
								border: `2px solid ${destinyStatus.ftl_status === 'ftl' ? '#007bff' : '#28a745'}`,
								borderRadius: '12px',
							}}>
								<Card.Body>
									<div className="text-center">
										<div style={{ 
											color: destinyStatus.ftl_status === 'ftl' ? '#007bff' : '#28a745', 
											fontSize: '1.1rem', 
											fontWeight: '600', 
											marginBottom: '8px', 
										}}>
											{destinyStatus.ftl_status === 'ftl' ? 'FTL Jump Countdown' : 'Normal Space'}
										</div>
                    
										{destinyStatus.ftl_status === 'ftl' && timeToJump > 0 ? (
											<div>
												<div style={{ 
													color: '#ffc107', 
													fontSize: '1.8rem', 
													fontWeight: 'bold',
													marginBottom: '4px',
													fontFamily: 'monospace',
												}}>
													{timeToJumpHours}h {timeToJumpMinutes}m
												</div>
												<div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                          Until drop from hyperspace
												</div>
											</div>
										) : (
											<div>
												<div style={{ 
													color: destinyStatus.ftl_status === 'ftl' ? '#007bff' : '#28a745', 
													fontSize: '1.4rem', 
													fontWeight: 'bold',
													marginBottom: '4px',
												}}>
													{destinyStatus.ftl_status === 'ftl' ? 'HYPERSPACE' : 'READY'}
												</div>
												<div style={{ color: '#aaa', fontSize: '0.85rem' }}>
													{destinyStatus.ftl_status === 'ftl' 
														? 'No scheduled exit time'
														: 'Ready for FTL jump'
													}
												</div>
											</div>
										)}
									</div>
								</Card.Body>
							</Card>
						</Col>
					</Row>
          
					{/* Time Speed Controls */}
					<div style={{ marginTop: '1rem' }}>
						<div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              Time Speed: <strong>{destinyStatus.time_speed}x</strong> ({destinyStatus.time_speed} minutes per second)
						</div>
						<div className="d-flex justify-content-center">
							<ButtonGroup size="sm">
								<Button 
									variant={destinyStatus.time_speed === 0 ? 'warning' : 'outline-warning'}
									onClick={() => onSetTimeSpeed?.(0)}
									title="Pause time"
								>
									<FaPause /> Pause
								</Button>
								<Button 
									variant={destinyStatus.time_speed === 1 ? 'success' : 'outline-success'}
									onClick={() => onSetTimeSpeed?.(1)}
									title="Normal time (1 minute per second)"
								>
									<FaPlay /> 1x
								</Button>
								<Button 
									variant={destinyStatus.time_speed === 5 ? 'info' : 'outline-info'}
									onClick={() => onSetTimeSpeed?.(5)}
									title="Fast time (5 minutes per second)"
								>
									<FaFastForward /> 5x
								</Button>
								<Button 
									variant={destinyStatus.time_speed === 10 ? 'primary' : 'outline-primary'}
									onClick={() => onSetTimeSpeed?.(10)}
									title="Very fast time (10 minutes per second)"
								>
									<FaStepForward /> 10x
								</Button>
							</ButtonGroup>
						</div>
					</div>
				</div>

				{/* Ship Systems */}
				<h6 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid #6c757d', paddingBottom: '0.5rem' }}>
          Ship Systems Status
				</h6>
				<Row>
					<Col md={4} className="mb-3">
						<ResourceCard
							icon={<FaBolt />}
							title="Power Systems"
							current={destinyStatus.power}
							max={destinyStatus.max_power}
							color="#ffc107"
							description="Main power grid status. Critical for all ship operations."
						/>
					</Col>
					<Col md={4} className="mb-3">
						<ResourceCard
							icon={<FaShieldAlt />}
							title="Shield Array"
							current={destinyStatus.shields}
							max={destinyStatus.max_shields}
							color="#17a2b8"
							description="Defensive shields protecting against space debris and energy weapons."
						/>
					</Col>
					<Col md={4} className="mb-3">
						<ResourceCard
							icon={<FaHeart />}
							title="Hull Integrity"
							current={destinyStatus.hull}
							max={destinyStatus.max_hull}
							color="#dc3545"
							description="Structural integrity of the ship's hull. Critical for life support."
						/>
					</Col>
					<Col md={6} className="mb-3">
						<ResourceCard
							icon={<FaLeaf />}
							title="Oxygen Levels"
							current={destinyStatus.o2}
							color="#28a745"
							description="Atmospheric oxygen concentration. Essential for crew survival."
						/>
					</Col>
					<Col md={6} className="mb-3">
						<ResourceCard
							icon={<FaCloud />}
							title="CO2 Scrubbers"
							current={destinyStatus.co2Scrubbers}
							color="#6c757d"
							description="Carbon dioxide scrubber efficiency. Removes CO2 from ship atmosphere."
						/>
					</Col>
				</Row>
			</div>
		);
	};

	const renderResourcesTab = () => (
		<Row>
			<Col md={3} className="mb-3">
				<ResourceCard
					icon={<FaTint />}
					title="Water Reserves"
					current={destinyStatus.water}
					max={destinyStatus.max_water}
					color="#17a2b8"
					description="Potable water for drinking, hygiene, and hydroponics."
				/>
			</Col>
			<Col md={3} className="mb-3">
				<ResourceCard
					icon={<FaUtensils />}
					title="Food Supplies"
					current={destinyStatus.food}
					max={destinyStatus.max_food}
					color="#fd7e14"
					description="Nutritional provisions for the crew. Rations and fresh produce."
				/>
			</Col>
			<Col md={3} className="mb-3">
				<ResourceCard
					icon={<FaCog />}
					title="Spare Parts"
					current={destinyStatus.spare_parts}
					max={destinyStatus.max_spare_parts}
					color="#6c757d"
					description="Mechanical components for repairs and maintenance."
				/>
			</Col>
			<Col md={3} className="mb-3">
				<ResourceCard
					icon={<FaMedkit />}
					title="Medical Supplies"
					current={destinyStatus.medical_supplies}
					max={destinyStatus.max_medical_supplies}
					color="#dc3545"
					description="Pharmaceuticals and medical equipment for crew health."
				/>
			</Col>
		</Row>
	);

	const renderCrewTab = () => (
		<div>
			<div className="d-flex align-items-center mb-3">
				<FaUsers style={{ color: '#6f42c1', fontSize: '1.5rem', marginRight: '10px' }} />
				<h5 style={{ color: 'white', margin: 0 }}>Active Crew Members: {characters.length}</h5>
			</div>
      
			{characters.length > 0 ? (
				<Table variant="dark" striped>
					<thead>
						<tr>
							<th>Name</th>
							<th>Role</th>
							<th>Health</th>
							<th>Location</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{characters.map((character) => (
							<tr key={character.id}>
								<td>
									<div className="d-flex align-items-center">
										{character.image && (
											<img 
												src={character.image} 
												alt={character.name}
												style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '8px' }}
											/>
										)}
										{character.name}
									</div>
								</td>
								<td>
									<Badge bg="secondary">{character.role}</Badge>
								</td>
								<td>
									<ProgressBar 
										variant={character.health > 75 ? 'success' : character.health > 40 ? 'warning' : 'danger'}
										now={character.health} 
										label={`${character.health}%`}
										style={{ minWidth: '80px' }}
									/>
								</td>
								<td>{character.current_room_id}</td>
								<td>
									<Badge bg={character.health > 75 ? 'success' : 'warning'}>
										{character.health > 75 ? 'Healthy' : 'Injured'}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			) : (
				<div style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>
					<FaUsers style={{ fontSize: '3rem', marginBottom: '1rem' }} />
					<div>No crew members assigned to this mission.</div>
				</div>
			)}
		</div>
	);

	const renderTechnologyTab = () => (
		<div>
			<div className="d-flex align-items-center mb-3">
				<FaFlask style={{ color: '#20c997', fontSize: '1.5rem', marginRight: '10px' }} />
				<h5 style={{ color: 'white', margin: 0 }}>Discovered Technologies: {technologies.length}</h5>
			</div>
      
			{technologies.length > 0 ? (
				<Row>
					{technologies.map((techId, index) => (
						<Col md={6} lg={4} key={techId} className="mb-3">
							<Card style={{ background: 'rgba(32, 201, 151, 0.1)', border: '1px solid rgba(32, 201, 151, 0.3)' }}>
								<Card.Body>
									<div className="d-flex align-items-center">
										<FaBroadcastTower style={{ color: '#20c997', marginRight: '8px' }} />
										<Card.Title style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                      Technology #{techId}
										</Card.Title>
									</div>
									<div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '8px' }}>
                    Ancient technology discovered during exploration.
									</div>
								</Card.Body>
							</Card>
						</Col>
					))}
				</Row>
			) : (
				<div style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>
					<FaFlask style={{ fontSize: '3rem', marginBottom: '1rem' }} />
					<div>No technologies discovered yet. Explore the ship to find Ancient tech.</div>
				</div>
			)}
		</div>
	);

	const renderExplorationTab = () => {
		let locationInfo;
		try {
			locationInfo = JSON.parse(destinyStatus.location || '{}');
		} catch {
			locationInfo = {};
		}

		return (
			<div>
				<div className="d-flex align-items-center mb-3">
					<FaMapMarkerAlt style={{ color: '#fd7e14', fontSize: '1.5rem', marginRight: '10px' }} />
					<h5 style={{ color: 'white', margin: 0 }}>Navigation & Exploration</h5>
				</div>
        
				<Row>
					<Col md={4} className="mb-3">
						<ResourceCard
							icon={<FaClock />}
							title="Mission Time"
							current={destinyStatus.game_days * 24 + destinyStatus.game_hours}
							color="#20c997"
							description="Total time elapsed since mission began."
							format="time"
						/>
					</Col>
					<Col md={4} className="mb-3">
						<ResourceCard
							icon={<FaRocket />}
							title="FTL Status"
							current={destinyStatus.ftl_status === 'ftl' ? 1 : 0}
							color={destinyStatus.ftl_status === 'ftl' ? '#007bff' : '#28a745'}
							description={destinyStatus.ftl_status === 'ftl' ? 'Ship is in hyperspace' : 'Ship is in normal space'}
						/>
					</Col>
					<Col md={4} className="mb-3">
						<Card className="h-100" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
							<Card.Body>
								<div className="d-flex align-items-center mb-2">
									<span style={{ color: '#fd7e14', fontSize: '1.2rem', marginRight: '8px' }}>
										<FaMapMarkerAlt />
									</span>
									<Card.Title style={{ color: 'white', margin: 0, fontSize: '1rem' }}>
                    Current Location
									</Card.Title>
								</div>
                
								<div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>
									{destinyStatus.ftl_status === 'ftl' ? 'Hyperspace' : locationInfo.system || 'Unknown System'}
								</div>
                
								{destinyStatus.ftl_status !== 'ftl' && (
									<div style={{ color: '#aaa', fontSize: '0.8rem' }}>
										{locationInfo.galaxy || 'Unknown Galaxy'}
										{locationInfo.sector && ` • Sector ${locationInfo.sector}`}
									</div>
								)}
                
								<div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '8px' }}>
									{destinyStatus.ftl_status === 'ftl' 
										? `Traveling at faster-than-light speed.${destinyStatus.next_ftl_transition > 0 ? ` Dropping out in ${destinyStatus.next_ftl_transition.toFixed(1)}h.` : ''}`
										: 'Ship position in current star system.'
									}
								</div>
							</Card.Body>
						</Card>
					</Col>
				</Row>

				{/* FTL Controls */}
				<div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
					<h6 style={{ color: 'white', marginBottom: '1rem' }}>FTL Drive Controls</h6>
					<Row>
						<Col md={6}>
							<div style={{ 
								background: 'rgba(13, 110, 253, 0.1)', 
								border: '1px solid rgba(13, 110, 253, 0.3)',
								borderRadius: '8px',
								padding: '1rem',
							}}>
								<div style={{ color: '#007bff', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Emergency Jump
								</div>
								<div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  Perform immediate FTL jump to escape danger. Duration: 2-4 hours.
								</div>
								<button 
									className="btn btn-outline-primary btn-sm"
									disabled={destinyStatus.ftl_status === 'ftl'}
									onClick={() => {
										if (onStartFTLJump && destinyStatus.ftl_status !== 'ftl') {
											const jumpDuration = 2 + Math.random() * 2; // 2-4 hours
											onStartFTLJump(jumpDuration);
										}
									}}
									style={{ opacity: destinyStatus.ftl_status === 'ftl' ? 0.5 : 1 }}
								>
									{destinyStatus.ftl_status === 'ftl' ? 'Already in FTL' : 'Emergency Jump'}
								</button>
							</div>
						</Col>
						<Col md={6}>
							<div style={{ 
								background: 'rgba(40, 167, 69, 0.1)', 
								border: '1px solid rgba(40, 167, 69, 0.3)',
								borderRadius: '8px',
								padding: '1rem',
							}}>
								<div style={{ color: '#28a745', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Drop from FTL
								</div>
								<div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  Exit hyperspace early to investigate or respond to signals.
								</div>
								<button 
									className="btn btn-outline-success btn-sm"
									disabled={destinyStatus.ftl_status !== 'ftl'}
									onClick={() => {
										if (onExitFTL && destinyStatus.ftl_status === 'ftl') {
											onExitFTL();
										}
									}}
									style={{ opacity: destinyStatus.ftl_status !== 'ftl' ? 0.5 : 1 }}
								>
									{destinyStatus.ftl_status !== 'ftl' ? 'Not in FTL' : 'Drop from FTL'}
								</button>
							</div>
						</Col>
					</Row>
				</div>
      
				{exploredRooms.length > 0 ? (
					<div style={{ marginTop: '1rem' }}>
						<h6 style={{ color: 'white' }}>Explored Rooms:</h6>
						<Row>
							{exploredRooms.map((roomId, index) => (
								<Col md={4} key={roomId} className="mb-2">
									<Badge bg="info" style={{ fontSize: '0.8rem' }}>
                  Room {roomId}
									</Badge>
								</Col>
							))}
						</Row>
					</div>
				) : (
					<div style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>
						<FaMapMarkerAlt style={{ fontSize: '3rem', marginBottom: '1rem' }} />
						<div>Begin exploring the ship to map discovered areas.</div>
					</div>
				)}
			</div>
		);
	};

	const renderTabContent = () => {
		switch (focusedTab) {
		case 0: return renderSystemsTab();
		case 1: return renderResourcesTab();
		case 2: return renderCrewTab();
		case 3: return renderTechnologyTab();
		case 4: return renderExplorationTab();
		default: return renderSystemsTab();
		}
	};

	return (
		<Modal 
			show={show} 
			onHide={onHide}
			fullscreen
			backdrop="static"
			keyboard={false}
			contentClassName="bg-dark text-light"
		>
			<Modal.Header style={{ background: 'rgba(0, 0, 0, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
				<Modal.Title className="d-flex align-items-center">
					<FaDatabase style={{ marginRight: '10px', color: '#007bff' }} />
          Ship Status & Inventory
				</Modal.Title>
			</Modal.Header>
      
			<Modal.Body style={{ background: 'rgba(0, 0, 0, 0.95)', padding: 0 }}>
				<Container fluid style={{ height: '100%' }}>
					<Row style={{ height: '100%' }}>
						{/* Navigation Sidebar */}
						<Col md={3} lg={2} style={{ 
							background: 'rgba(0, 0, 0, 0.7)', 
							borderRight: '1px solid rgba(255, 255, 255, 0.1)',
							padding: '1rem 0',
						}}>
							<Nav variant="pills" className="flex-column">
								{tabs.map((tab, index) => (
									<Nav.Item key={tab.key} className="mb-2">
										<Nav.Link
											active={focusedTab === index}
											onClick={() => onTabChange(index)}
											style={{
												color: focusedTab === index ? 'white' : '#aaa',
												background: focusedTab === index ? 'rgba(13, 110, 253, 0.8)' : 'transparent',
												border: focusedTab === index ? '2px solid rgba(13, 110, 253, 1)' : '1px solid transparent',
												boxShadow: focusedTab === index ? '0 0 10px rgba(13, 110, 253, 0.5)' : 'none',
											}}
										>
											<span style={{ marginRight: '8px' }}>{tab.icon}</span>
											{tab.label}
										</Nav.Link>
									</Nav.Item>
								))}
							</Nav>
						</Col>
            
						{/* Content Area */}
						<Col md={9} lg={10} style={{ padding: '2rem' }}>
							{renderTabContent()}
						</Col>
					</Row>
				</Container>
			</Modal.Body>
      
			<Modal.Footer style={{ 
				background: 'rgba(0, 0, 0, 0.9)', 
				borderTop: '1px solid rgba(255, 255, 255, 0.1)',
				justifyContent: 'center',
			}}>
				<div style={{ color: '#aaa', fontSize: '0.9rem' }}>
          Use D-pad to navigate • A to select • B to close • Start to open inventory
				</div>
			</Modal.Footer>
		</Modal>
	);
};