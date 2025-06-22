import { RoomTemplate, DoorTemplate } from '@stargate/common';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { adminService } from '../services/admin-service';

interface RoomBuilderProps {
	selectedFloor: number;
	onFloorChange: (floor: number) => void;
}

type DragState = {
	isDragging: boolean;
	dragType: 'room' | 'door' | 'none';
	dragId: string | null;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
};

export const RoomBuilder: React.FC<RoomBuilderProps> = ({ selectedFloor, onFloorChange }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [rooms, setRooms] = useState<RoomTemplate[]>([]);
	const [doors, setDoors] = useState<DoorTemplate[]>([]);
	const [selectedRoom, setSelectedRoom] = useState<RoomTemplate | null>(null);
	const [selectedDoor, setSelectedDoor] = useState<DoorTemplate | null>(null);
	const [showRoomModal, setShowRoomModal] = useState(false);
	const [showDoorModal, setShowDoorModal] = useState(false);
	const [editingRoom, setEditingRoom] = useState<Partial<RoomTemplate>>({});
	const [editingDoor, setEditingDoor] = useState<Partial<DoorTemplate>>({});
	const [dragState, setDragState] = useState<DragState>({
		isDragging: false,
		dragType: 'none',
		dragId: null,
		startX: 0,
		startY: 0,
		currentX: 0,
		currentY: 0,
	});

	// Canvas settings for Swift SpriteKit coordinate system
	const CANVAS_WIDTH = 1200;
	const CANVAS_HEIGHT = 800;
	const GRID_SIZE = 32; // 32 points grid for SpriteKit
	const ZOOM_LEVEL = 1.0;

	// Filter rooms by selected floor
	const floorRooms = useMemo(() => {
		return rooms.filter(room => room.floor === selectedFloor);
	}, [rooms, selectedFloor]);

	// Filter doors by rooms on selected floor
	const floorDoors = useMemo(() => {
		const floorRoomIds = new Set(floorRooms.map(r => r.id));
		return doors.filter(door =>
			floorRoomIds.has(door.from_room_id) || floorRoomIds.has(door.to_room_id),
		);
	}, [doors, floorRooms]);

	useEffect(() => {
		loadData();
	}, []);

	useEffect(() => {
		drawCanvas();
	}, [floorRooms, floorDoors, selectedRoom, selectedDoor, dragState]);

	const loadData = async () => {
		try {
			const [roomsData, doorsData] = await Promise.all([
				adminService.getAllRoomTemplates?.() || [], // Add optional chaining
				adminService.getAllDoors?.() || [], // Add optional chaining
			]);
			setRooms(roomsData);
			setDoors(doorsData);
		} catch (err: any) {
			toast.error(err.message || 'Failed to load room builder data');
		}
	};

	const drawCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Draw grid
		drawGrid(ctx);

		// Draw rooms
		floorRooms.forEach(room => drawRoom(ctx, room));

		// Draw doors
		floorDoors.forEach(door => drawDoor(ctx, door));

		// Draw selection highlights
		if (selectedRoom) {
			highlightRoom(ctx, selectedRoom);
		}
		if (selectedDoor) {
			highlightDoor(ctx, selectedDoor);
		}
	};

	const drawGrid = (ctx: CanvasRenderingContext2D) => {
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 0.5;

		// Vertical lines
		for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, CANVAS_HEIGHT);
			ctx.stroke();
		}

		// Horizontal lines
		for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(CANVAS_WIDTH, y);
			ctx.stroke();
		}
	};

	const drawRoom = (ctx: CanvasRenderingContext2D, room: RoomTemplate) => {
		const width = room.endX - room.startX;
		const height = room.endY - room.startY;

		// Room background
		ctx.fillStyle = room.type === 'corridor' ? '#4a5568' : '#2d3748';
		ctx.fillRect(room.startX, room.startY, width, height);

		// Room border
		ctx.strokeStyle = room.locked ? '#e53e3e' : '#718096';
		ctx.lineWidth = 2;
		ctx.strokeRect(room.startX, room.startY, width, height);

		// Room label
		ctx.fillStyle = '#fff';
		ctx.font = '12px Arial';
		ctx.textAlign = 'center';
		const centerX = room.startX + width / 2;
		const centerY = room.startY + height / 2;
		ctx.fillText(room.name, centerX, centerY);
		ctx.fillText(`${room.id}`, centerX, centerY + 15);
	};

	const drawDoor = (ctx: CanvasRenderingContext2D, door: DoorTemplate) => {
		const halfWidth = door.width / 2;
		const halfHeight = door.height / 2;

		ctx.save();
		ctx.translate(door.x, door.y);
		ctx.rotate((door.rotation * Math.PI) / 180);

		// Door color based on state
		let doorColor = '#8b5cf6'; // purple for closed
		if (door.state === 'opened') doorColor = '#10b981'; // green
		if (door.state === 'locked') doorColor = '#ef4444'; // red

		ctx.fillStyle = doorColor;
		ctx.fillRect(-halfWidth, -halfHeight, door.width, door.height);

		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1;
		ctx.strokeRect(-halfWidth, -halfHeight, door.width, door.height);

		ctx.restore();
	};

	const highlightRoom = (ctx: CanvasRenderingContext2D, room: RoomTemplate) => {
		const width = room.endX - room.startX;
		const height = room.endY - room.startY;

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = 3;
		ctx.setLineDash([5, 5]);
		ctx.strokeRect(room.startX - 2, room.startY - 2, width + 4, height + 4);
		ctx.setLineDash([]);
	};

	const highlightDoor = (ctx: CanvasRenderingContext2D, door: DoorTemplate) => {
		const halfWidth = door.width / 2 + 2;
		const halfHeight = door.height / 2 + 2;

		ctx.save();
		ctx.translate(door.x, door.y);
		ctx.rotate((door.rotation * Math.PI) / 180);

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = 2;
		ctx.setLineDash([3, 3]);
		ctx.strokeRect(-halfWidth, -halfHeight, door.width + 4, door.height + 4);
		ctx.setLineDash([]);

		ctx.restore();
	};

	const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Check if clicked on a door first (smaller hit targets)
		const clickedDoor = floorDoors.find(door => {
			const halfWidth = door.width / 2;
			const halfHeight = door.height / 2;
			return x >= door.x - halfWidth && x <= door.x + halfWidth &&
				   y >= door.y - halfHeight && y <= door.y + halfHeight;
		});

		if (clickedDoor) {
			setSelectedDoor(clickedDoor);
			setSelectedRoom(null);
			return;
		}

		// Check if clicked on a room
		const clickedRoom = floorRooms.find(room => {
			return x >= room.startX && x <= room.endX &&
				   y >= room.startY && y <= room.endY;
		});

		if (clickedRoom) {
			setSelectedRoom(clickedRoom);
			setSelectedDoor(null);
		} else {
			setSelectedRoom(null);
			setSelectedDoor(null);
		}
	};

	const handleCreateRoom = () => {
		setEditingRoom({
			id: `room_${Date.now()}`,
			layout_id: 'destiny',
			type: 'corridor',
			name: 'New Room',
			description: '',
			startX: 100,
			endX: 200,
			startY: 100,
			endY: 200,
			floor: selectedFloor,
			width: 100, // Legacy compatibility
			height: 100, // Legacy compatibility
			found: false,
			locked: false,
			explored: false,
			base_exploration_time: 2,
			status: 'ok',
			connection_north: null,
			connection_south: null,
			connection_east: null,
			connection_west: null,
			created_at: Date.now(),
			updated_at: Date.now(),
		});
		setShowRoomModal(true);
	};

	const handleCreateDoor = () => {
		if (!selectedRoom) {
			toast.error('Please select a room first');
			return;
		}

		setEditingDoor({
			id: `door_${Date.now()}`,
			from_room_id: selectedRoom.id,
			to_room_id: '',
			x: selectedRoom.startX + (selectedRoom.endX - selectedRoom.startX) / 2,
			y: selectedRoom.startY,
			width: 32,
			height: 8,
			rotation: 0,
			state: 'closed',
			is_automatic: false,
			open_direction: 'inward',
			style: 'standard',
			power_required: 0,
			created_at: Date.now(),
			updated_at: Date.now(),
		});
		setShowDoorModal(true);
	};

	const availableRoomsForDoor = useMemo(() => {
		return floorRooms.filter(room => room.id !== editingDoor.from_room_id);
	}, [floorRooms, editingDoor.from_room_id]);

	return (
		<div className="room-builder">
			<div className="d-flex">
				{/* Left Panel - Tools and Properties */}
				<div className="room-builder-panel" style={{ width: '300px', padding: '1rem' }}>
					<h5>Room Builder</h5>

					<div className="mb-3">
						<Form.Label>Floor</Form.Label>
						<Form.Select
							value={selectedFloor}
							onChange={(e) => onFloorChange(parseInt(e.target.value))}
						>
							{Array.from(new Set(rooms.map(r => r.floor))).sort().map(floor => (
								<option key={floor} value={floor}>Floor {floor}</option>
							))}
						</Form.Select>
					</div>

					<div className="d-grid gap-2 mb-3">
						<Button variant="primary" onClick={handleCreateRoom}>
							<FaPlus /> Add Room
						</Button>
						<Button
							variant="secondary"
							onClick={handleCreateDoor}
							disabled={!selectedRoom}
						>
							<FaPlus /> Add Door
						</Button>
					</div>

					{/* Selected Room Properties */}
					{selectedRoom && (
						<Card className="mb-3">
							<Card.Header>Selected Room</Card.Header>
							<Card.Body>
								<p><strong>{selectedRoom.name}</strong></p>
								<p>ID: <code>{selectedRoom.id}</code></p>
								<p>Position: ({selectedRoom.startX}, {selectedRoom.startY}) to ({selectedRoom.endX}, {selectedRoom.endY})</p>
								<p>Size: {selectedRoom.endX - selectedRoom.startX} × {selectedRoom.endY - selectedRoom.startY}</p>
								<div className="d-grid gap-2">
									<Button
										size="sm"
										variant="outline-warning"
										onClick={() => {
											setEditingRoom({...selectedRoom});
											setShowRoomModal(true);
										}}
									>
										<FaEdit /> Edit
									</Button>
									<Button
										size="sm"
										variant="outline-danger"
										onClick={async () => {
											if (!confirm('Are you sure you want to delete this room? This will also delete all connected doors.')) return;
											try {
												await adminService.deleteRoom(selectedRoom.id);
												toast.success('Room deleted successfully');
												setSelectedRoom(null);
												loadData();
											} catch (err: any) {
												toast.error(err.message || 'Failed to delete room');
											}
										}}
									>
										<FaTrash /> Delete
									</Button>
								</div>
							</Card.Body>
						</Card>
					)}

					{/* Selected Door Properties */}
					{selectedDoor && (
						<Card className="mb-3">
							<Card.Header>Selected Door</Card.Header>
							<Card.Body>
								<p>ID: <code>{selectedDoor.id}</code></p>
								<p>Position: ({selectedDoor.x}, {selectedDoor.y})</p>
								<p>State: <span className={`badge bg-${selectedDoor.state === 'opened' ? 'success' : selectedDoor.state === 'locked' ? 'danger' : 'secondary'}`}>{selectedDoor.state}</span></p>
								<p>Connects: {selectedDoor.from_room_id} ↔ {selectedDoor.to_room_id}</p>
								<div className="d-grid gap-2">
									<Button
										size="sm"
										variant="outline-warning"
										onClick={() => {
											setEditingDoor({...selectedDoor});
											setShowDoorModal(true);
										}}
									>
										<FaEdit /> Edit
									</Button>
									<Button
										size="sm"
										variant="outline-danger"
										onClick={async () => {
											if (!confirm('Are you sure you want to delete this door?')) return;
											try {
												await adminService.deleteDoor(selectedDoor.id);
												toast.success('Door deleted successfully');
												setSelectedDoor(null);
												loadData();
											} catch (err: any) {
												toast.error(err.message || 'Failed to delete door');
											}
										}}
									>
										<FaTrash /> Delete
									</Button>
								</div>
							</Card.Body>
						</Card>
					)}

					{/* Floor Statistics */}
					<Card>
						<Card.Header>Floor Statistics</Card.Header>
						<Card.Body>
							<p>Rooms: {floorRooms.length}</p>
							<p>Doors: {floorDoors.length}</p>
						</Card.Body>
					</Card>
				</div>

				{/* Right Panel - Canvas */}
				<div className="flex-grow-1" style={{ padding: '1rem' }}>
					<canvas
						ref={canvasRef}
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						style={{
							border: '1px solid #ccc',
							backgroundColor: '#1a202c',
							cursor: dragState.isDragging ? 'grabbing' : 'crosshair',
						}}
						onClick={handleCanvasClick}
					/>
				</div>
			</div>

			{/* Room Modal */}
			<Modal show={showRoomModal} onHide={() => setShowRoomModal(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Room Properties</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Room ID</Form.Label>
									<Form.Control
										type="text"
										value={editingRoom.id || ''}
										onChange={(e) => setEditingRoom({...editingRoom, id: e.target.value})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Name</Form.Label>
									<Form.Control
										type="text"
										value={editingRoom.name || ''}
										onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})}
									/>
								</Form.Group>
							</div>
						</div>

						<Form.Group className="mb-3">
							<Form.Label>Description</Form.Label>
							<Form.Control
								as="textarea"
								rows={2}
								value={editingRoom.description || ''}
								onChange={(e) => setEditingRoom({...editingRoom, description: e.target.value})}
							/>
						</Form.Group>

						<div className="row">
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>Start X</Form.Label>
									<Form.Control
										type="number"
										value={editingRoom.startX || 0}
										onChange={(e) => setEditingRoom({...editingRoom, startX: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>End X</Form.Label>
									<Form.Control
										type="number"
										value={editingRoom.endX || 0}
										onChange={(e) => setEditingRoom({...editingRoom, endX: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>Start Y</Form.Label>
									<Form.Control
										type="number"
										value={editingRoom.startY || 0}
										onChange={(e) => setEditingRoom({...editingRoom, startY: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>End Y</Form.Label>
									<Form.Control
										type="number"
										value={editingRoom.endY || 0}
										onChange={(e) => setEditingRoom({...editingRoom, endY: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Type</Form.Label>
									<Form.Select
										value={editingRoom.type || 'corridor'}
										onChange={(e) => setEditingRoom({...editingRoom, type: e.target.value})}
									>
										<option value="corridor">Corridor</option>
										<option value="bridge">Bridge</option>
										<option value="quarters">Quarters</option>
										<option value="hydroponics">Hydroponics</option>
										<option value="gate_room">Gate Room</option>
										<option value="elevator">Elevator</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Floor</Form.Label>
									<Form.Control
										type="number"
										value={editingRoom.floor || 0}
										onChange={(e) => setEditingRoom({...editingRoom, floor: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Status</Form.Label>
									<Form.Select
										value={editingRoom.status || 'ok'}
										onChange={(e) => setEditingRoom({...editingRoom, status: e.target.value})}
									>
										<option value="ok">OK</option>
										<option value="damaged">Damaged</option>
										<option value="destroyed">Destroyed</option>
									</Form.Select>
								</Form.Group>
							</div>
						</div>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowRoomModal(false)}>
						Cancel
					</Button>
					<Button variant="primary" onClick={async () => {
						try {
							// Calculate legacy width/height for compatibility
							const roomData = {
								...editingRoom,
								width: (editingRoom.endX || 0) - (editingRoom.startX || 0),
								height: (editingRoom.endY || 0) - (editingRoom.startY || 0),
							};

							if (selectedRoom?.id === editingRoom.id) {
								await adminService.updateRoom(editingRoom.id!, roomData);
								toast.success('Room updated successfully');
							} else {
								await adminService.createRoom(roomData);
								toast.success('Room created successfully');
							}
							setShowRoomModal(false);
							loadData();
						} catch (err: any) {
							toast.error(err.message || 'Failed to save room');
						}
					}}>
						Save Room
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Door Modal */}
			<Modal show={showDoorModal} onHide={() => setShowDoorModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Door Properties</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<Form.Group className="mb-3">
							<Form.Label>Door ID</Form.Label>
							<Form.Control
								type="text"
								value={editingDoor.id || ''}
								onChange={(e) => setEditingDoor({...editingDoor, id: e.target.value})}
							/>
						</Form.Group>

						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>From Room</Form.Label>
									<Form.Control
										type="text"
										value={editingDoor.from_room_id || ''}
										disabled
									/>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>To Room</Form.Label>
									<Form.Select
										value={editingDoor.to_room_id || ''}
										onChange={(e) => setEditingDoor({...editingDoor, to_room_id: e.target.value})}
									>
										<option value="">Select room...</option>
										{availableRoomsForDoor.map(room => (
											<option key={room.id} value={room.id}>{room.name} ({room.id})</option>
										))}
									</Form.Select>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>X Position</Form.Label>
									<Form.Control
										type="number"
										value={editingDoor.x || 0}
										onChange={(e) => setEditingDoor({...editingDoor, x: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Y Position</Form.Label>
									<Form.Control
										type="number"
										value={editingDoor.y || 0}
										onChange={(e) => setEditingDoor({...editingDoor, y: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Rotation</Form.Label>
									<Form.Select
										value={editingDoor.rotation || 0}
										onChange={(e) => setEditingDoor({...editingDoor, rotation: parseInt(e.target.value)})}
									>
										<option value={0}>0° (Horizontal)</option>
										<option value={90}>90° (Vertical)</option>
										<option value={180}>180° (Horizontal Flipped)</option>
										<option value={270}>270° (Vertical Flipped)</option>
									</Form.Select>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Width</Form.Label>
									<Form.Control
										type="number"
										value={editingDoor.width || 32}
										onChange={(e) => setEditingDoor({...editingDoor, width: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Height</Form.Label>
									<Form.Control
										type="number"
										value={editingDoor.height || 8}
										onChange={(e) => setEditingDoor({...editingDoor, height: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>State</Form.Label>
									<Form.Select
										value={editingDoor.state || 'closed'}
										onChange={(e) => setEditingDoor({...editingDoor, state: e.target.value as any})}
									>
										<option value="closed">Closed</option>
										<option value="opened">Opened</option>
										<option value="locked">Locked</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Style</Form.Label>
									<Form.Select
										value={editingDoor.style || 'standard'}
										onChange={(e) => setEditingDoor({...editingDoor, style: e.target.value})}
									>
										<option value="standard">Standard</option>
										<option value="blast_door">Blast Door</option>
										<option value="airlock">Airlock</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Direction</Form.Label>
									<Form.Select
										value={editingDoor.open_direction || 'inward'}
										onChange={(e) => setEditingDoor({...editingDoor, open_direction: e.target.value as any})}
									>
										<option value="inward">Inward</option>
										<option value="outward">Outward</option>
										<option value="sliding">Sliding</option>
									</Form.Select>
								</Form.Group>
							</div>
						</div>

						<Form.Check
							type="checkbox"
							label="Automatic Door"
							checked={editingDoor.is_automatic || false}
							onChange={(e) => setEditingDoor({...editingDoor, is_automatic: e.target.checked})}
						/>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowDoorModal(false)}>
						Cancel
					</Button>
					<Button variant="primary" onClick={async () => {
						try {
							if (selectedDoor?.id === editingDoor.id) {
								await adminService.updateDoor(editingDoor.id!, editingDoor);
								toast.success('Door updated successfully');
							} else {
								await adminService.createDoor(editingDoor);
								toast.success('Door created successfully');
							}
							setShowDoorModal(false);
							loadData();
						} catch (err: any) {
							toast.error(err.message || 'Failed to save door');
						}
					}}>
						Save Door
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};
