import type { DoorInfo, DoorRequirement, RoomTemplate } from '@stargate/common';
import React from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { GiKey } from 'react-icons/gi';

import { useDestinyStatus } from '../contexts/destiny-status-context';
import { events } from '../livestore/schema';
import apiService from '../services/api-service';
import { useGameService } from '../services/game-service';
import { WALL_THICKNESS, DOOR_SIZE, getConnectionSide } from '../utils/grid-system';

import { ShipDoorImage } from './ship-door-image';


interface DoorConnection {
	fromRoom: RoomTemplate;
	toRoom: RoomTemplate;
	doorInfo: DoorInfo;
	roomPosition: Record<string, { gridX: number; gridY: number }>;
	rotation: number;
}

export const ShipDoor: React.FC<DoorConnection> = ({
	fromRoom,
	toRoom,
	doorInfo,
	rotation,
}: DoorConnection) => {
	const gameService = useGameService();
	const { destinyStatus } = useDestinyStatus();
	const [debugMenu, setDebugMenu] = React.useState(false);
	const [hover, setHover] = React.useState(false);
	const [doorColor, setDoorColor] = React.useState('blue');
	const [isDanger, setIsDanger] = React.useState(false);
	const [isCodeLocked, setIsCodeLocked] = React.useState(false);
	const [showDoorModal, setShowDoorModal] = React.useState(false);
	const [showDangerWarning, setShowDangerWarning] = React.useState(false);
	const [dangerReason, setDangerReason] = React.useState('');

	const generateRandomRequirements = async (id: string) => {
		console.log('generating random requirements for door', id);
		const requirements: DoorRequirement[] = [];
		const allTechs = await apiService.getAllTechnologyTemplates();
		const techs = allTechs.filter(t => t.category === 'consumable');
		if (techs.length) {
			const totalRequiredItems = Math.floor(Math.random() * techs.length);
			console.log('totalRequiredItems', totalRequiredItems);
			for (let i = 0; i < totalRequiredItems; i++) {
				const tech = techs[Math.floor(Math.random() * techs.length)];
				requirements.push({
					type: tech.id,
					value: Math.floor(Math.random() * 10) + 1,
					description: tech.name,
					met: false,
				});
			}
			console.log('requirements', requirements);
			gameService.updateDoorState(id, 'locked', requirements);
		}
	};

	React.useEffect(() => {
		const danger = toRoom.status === 'damaged'
			|| toRoom.status === 'destroyed'
			|| fromRoom.status === 'damaged'
			|| fromRoom.status === 'destroyed';

		if (toRoom.status === 'damaged' || fromRoom.status === 'damaged') {
			setDangerReason('The room on the other side of this door may be damaged.');
		} else if (toRoom.status === 'destroyed' || fromRoom.status === 'destroyed') {
			setDangerReason('Nothing is on the other side of this door but the empty void of space.');
		}
		const isLocked = fromRoom.locked || toRoom.locked;
		setIsDanger(danger);
		setIsCodeLocked(isLocked);
		if (isDanger) {
			setDoorColor('red');
		} else if (isCodeLocked || doorInfo?.state === 'locked') {
			setDoorColor('gold');
		} else if (doorInfo?.state === 'opened') {
			setDoorColor('green');
		} else if (doorInfo?.state === 'closed') {
			if (doorInfo.requirements?.length) {
				// Door requirements that are NOT a code requirement
				setDoorColor('gray');
			} else {
				setDoorColor('blue');
			}
		} else {
			setDoorColor('white');
		}
		// Generate random requirements for a door that's locked without any requirements
		if (isLocked && !doorInfo.requirements?.length) {
			if (fromRoom.template_id === 'bridge' || toRoom.template_id === 'bridge') {
				console.log('Bridge requires a code');
				gameService.updateDoorState(doorInfo.id, 'locked', [{
					type: 'code',
					value: 1,
					description: 'You must have an ancient code to unlock this door.',
					met: false,
				}]);
			} else {
				generateRandomRequirements(doorInfo.id);
			}
		}
	}, [doorInfo]);

	// Handle door click
	const handleDoorClick = (event: React.MouseEvent) => {
		console.log('[DEBUG] Door clicked:', { fromRoom, toRoom, doorInfo });
		// Check to see if the user is holding down the shift key, if so we'll
		// open a DEBUG menu showing the door connection and the rooms it connects to.
		if (event.shiftKey) {
			// Open a DEBUG menu showing the door connection and the rooms it connects to.
			setDebugMenu(true);
		} else if (isCodeLocked) {
			setShowDoorModal(true);
		} else {
			// Standard Door click behavior
			if (doorInfo.state === 'closed') {
				console.log('doorInfo.requirements', doorInfo.requirements);
				if (doorInfo.requirements?.length) {
					setShowDoorModal(true);
				} else if (isDanger) {
					setShowDangerWarning(true);
				} else {
					gameService.openDoor(doorInfo);
				}
			} else {
				// Close the door
				gameService.updateDoorState(doorInfo.id, 'closed');
			}
		}
	};

	return (<>
		{debugMenu && (
			<Modal show={!!debugMenu} onHide={() => setDebugMenu(false)}>
				<Modal.Header>
					<Modal.Title>
						Debug Menu
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className="text-muted text-small">
						ID: {doorInfo.id}
					</div>
					<div className="mt-2">
						From Room: {fromRoom.name} {getConnectionSide(fromRoom, toRoom)}
						{fromRoom.status === 'damaged' && (
							<span className="ms-2 text-danger">DAMAGED</span>
						)}
						{fromRoom.status === 'destroyed' && (
							<span className="ms-2 text-danger">DESTROYED</span>
						)}
					</div>
					<div><code>{fromRoom.id}</code></div>

					<div className="mt-2">
						To Room: {toRoom.name} {getConnectionSide(toRoom, fromRoom)}
						{toRoom.status === 'damaged' && (
							<span className="ms-2 text-danger">DAMAGED</span>
						)}
						{toRoom.status === 'destroyed' && (
							<span className="ms-2 text-danger">DESTROYED</span>
						)}
					</div>
					<div><code>{toRoom.id}</code></div>

					<div className="mt-2">Current State: {doorInfo.state}</div>
					{doorInfo.requirements && (
						<div className="mt-2">Requirements: {doorInfo.requirements.map((req) => (
							<span key={req.type}>{req.type}: {req.value}</span>
						))}
						</div>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={() => setDebugMenu(false)}>Close</Button>
				</Modal.Footer>
			</Modal>
		)}
		<g key={`door-${fromRoom.id}-${toRoom.id}`}
			transform={rotation !== 0 ? `rotate(${rotation} 4 4)` : undefined}
		>
			{hover && (
				<rect x={0} y={0} width={DOOR_SIZE} height={WALL_THICKNESS} fill={doorColor} />
			)}
			<g
				style={{ cursor: 'pointer', opacity: 0.7 }}
				onClick={handleDoorClick}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
			>
				<ShipDoorImage
					state={doorInfo.state}
					isDanger={isDanger}
					isCodeLocked={isCodeLocked}
					width={DOOR_SIZE}
					height={WALL_THICKNESS}
				/>
			</g>
		</g>
		{/* Door Requirements Modal */}
		<Modal show={showDoorModal} onHide={() => setShowDoorModal(false)}>
			<Modal.Header closeButton>
				<Modal.Title>
					<GiKey className="me-2" />
					Door Locked
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div>
					<p><strong>Door:</strong> {fromRoom.name}</p>
					<Alert variant="warning">
						This door is locked. You must meet the following requirements to unlock it:
					</Alert>
					{doorInfo.requirements && doorInfo.requirements.length ? doorInfo.requirements.map((req, index) => {
						const isReqMet = false;
						return (
							<div key={index} className={`alert ${isReqMet ? 'alert-success' : 'alert-danger'} mb-2`}>
								<strong>{req.type.replace('_', ' ').toUpperCase()}:</strong> {req.description} (x{req.value || 1})
								{req.type === 'power_level' && destinyStatus && (
									<div className="mt-1">
										<small>Required: {req.value} | Current: {destinyStatus.power}</small>
									</div>
								)}
								{(req.type === 'item' || req.type === 'technology') && (
									<div className="mt-1">
										<small>
											In inventory: {0}
										</small>
									</div>
								)}
							</div>
						);
					}) : <div>No requirements found</div>}
					{/* Unlock/Open button if all requirements are met */}
					{
						doorInfo.requirements
						&& doorInfo.requirements.length > 0
						&& doorInfo.requirements.every((req: any) => false)
						&& (
							<Button
								variant="success"
								onClick={async () => {
									await gameService.openDoor(doorInfo);
									setShowDoorModal(false);
								}}
							> Unlock & Open Door</Button>
						)
					}
				</div>
			</Modal.Body>
		</Modal>

		{/* Dangerous Door Modal */}
		<Modal show={showDangerWarning} onHide={() => setShowDangerWarning(false)}>
			<Modal.Header closeButton>
				<Modal.Title>⚠️ Danger: Atmospheric Hazard</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div>
					<strong>Warning:</strong> {dangerReason || 'The door is falshing red, and is probably dangerous to open.'}
					<Alert variant="danger">
						Opening this door may result in catastrophic consequences (e.g., depressurization, loss of atmosphere, or crew harm). Proceed with extreme caution!
					</Alert>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="secondary" onClick={() => setShowDangerWarning(false)}>Cancel</Button>
				<Button variant="danger" onClick={() => {
					gameService.openDoor(doorInfo);
					setShowDangerWarning(false);
				}}>Override & Open Anyway</Button>
			</Modal.Footer>
		</Modal>
	</>);
};
