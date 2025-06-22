import { RoomTemplate, DoorTemplate, RoomFurniture, roomToWorldCoordinates } from '@stargate/common';
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
	dragType: 'room' | 'door' | 'camera' | 'none';
	dragId: string | null;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
};

type Camera = {
	x: number; // Camera position in world coordinates
	y: number; // Camera position in world coordinates
	zoom: number; // Zoom level (1.0 = normal, 2.0 = 2x zoom, 0.5 = 0.5x zoom)
};

export const RoomBuilder: React.FC<RoomBuilderProps> = ({ selectedFloor, onFloorChange }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [rooms, setRooms] = useState<RoomTemplate[]>([]);
	const [doors, setDoors] = useState<DoorTemplate[]>([]);
	const [furniture, setFurniture] = useState<RoomFurniture[]>([]);
	const [selectedRoom, setSelectedRoom] = useState<RoomTemplate | null>(null);
	const [selectedDoor, setSelectedDoor] = useState<DoorTemplate | null>(null);
	const [selectedFurniture, setSelectedFurniture] = useState<RoomFurniture | null>(null);
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
	const [isMouseDown, setIsMouseDown] = useState(false);

	// Camera state for pan/zoom
	const [camera, setCamera] = useState<Camera>({
		x: 0, // Start at world origin
		y: 0, // Start at world origin
		zoom: 1.0, // Start at 1x zoom
	});

	// Canvas settings - fixed viewport size
	const CANVAS_WIDTH = 1200;
	const CANVAS_HEIGHT = 800;
	const GRID_SIZE = 32; // 32 points grid for SpriteKit
	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 5.0;

	// Camera transformation functions
	const worldToScreen = (worldX: number, worldY: number) => {
		const screenX = (CANVAS_WIDTH / 2) + (worldX - camera.x) * camera.zoom;
		const screenY = (CANVAS_HEIGHT / 2) + (worldY - camera.y) * camera.zoom;
		return { x: screenX, y: screenY };
	};

	const screenToWorld = (screenX: number, screenY: number) => {
		const worldX = camera.x + (screenX - CANVAS_WIDTH / 2) / camera.zoom;
		const worldY = camera.y + (screenY - CANVAS_HEIGHT / 2) / camera.zoom;
		return { x: worldX, y: worldY };
	};

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

	// Filter furniture by rooms on selected floor
	const floorFurniture = useMemo(() => {
		const floorRoomIds = new Set(floorRooms.map(r => r.id));
		return furniture.filter(item => floorRoomIds.has(item.room_id));
	}, [furniture, floorRooms]);

	useEffect(() => {
		loadData();
	}, []);

	// Keyboard shortcuts for camera control
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Don't interfere with form inputs
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
				return;
			}

			const MOVE_SPEED = 50;
			const ZOOM_SPEED = 0.1;

			switch (event.key) {
			case 'ArrowLeft':
			case 'a':
			case 'A':
				event.preventDefault();
				setCamera(prev => ({ ...prev, x: prev.x - MOVE_SPEED / prev.zoom }));
				break;
			case 'ArrowRight':
			case 'd':
			case 'D':
				event.preventDefault();
				setCamera(prev => ({ ...prev, x: prev.x + MOVE_SPEED / prev.zoom }));
				break;
			case 'ArrowUp':
			case 'w':
			case 'W':
				event.preventDefault();
				setCamera(prev => ({ ...prev, y: prev.y - MOVE_SPEED / prev.zoom }));
				break;
			case 'ArrowDown':
			case 's':
			case 'S':
				event.preventDefault();
				setCamera(prev => ({ ...prev, y: prev.y + MOVE_SPEED / prev.zoom }));
				break;
			case '=':
			case '+':
				event.preventDefault();
				setCamera(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_SPEED) }));
				break;
			case '-':
			case '_':
				event.preventDefault();
				setCamera(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_SPEED) }));
				break;
			case '0':
				event.preventDefault();
				setCamera({ x: 0, y: 0, zoom: 1.0 });
				break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	useEffect(() => {
		drawCanvas();
	}, [floorRooms, floorDoors, floorFurniture, selectedRoom, selectedDoor, selectedFurniture, dragState, camera]);

	const loadData = async () => {
		try {
			// Load each data source separately with individual error handling
			const roomsData = await adminService.getAllRoomTemplates();

			let doorsData: any[] = [];
			try {
				doorsData = await adminService.getAllDoors();
			} catch (err: any) {
				console.error('Room Builder - Failed to load doors:', err);
				toast.warning('Failed to load doors: ' + err.message);
			}

			let furnitureData: any[] = [];
			try {
				furnitureData = await adminService.getAllFurniture();
			} catch (err: any) {
				console.error('Room Builder - Failed to load furniture:', err);
				toast.warning('Failed to load furniture: ' + err.message);
			}

			console.log('Room Builder - Data loaded:', {
				rooms: roomsData.length,
				doors: doorsData.length,
				furniture: furnitureData.length,
			});

			setRooms(roomsData);
			setDoors(doorsData);
			setFurniture(furnitureData);
		} catch (err: any) {
			console.error('Room Builder - Failed to load data:', err);
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

		// Draw center axes
		drawCenterAxes(ctx);

		// Draw rooms
		floorRooms.forEach(room => drawRoom(ctx, room));

		// Draw doors
		floorDoors.forEach(door => drawDoor(ctx, door));

		// Draw furniture
		floorFurniture.forEach(item => drawFurniture(ctx, item));

		// Draw selection highlights
		if (selectedRoom) {
			highlightRoom(ctx, selectedRoom);
		}
		if (selectedDoor) {
			highlightDoor(ctx, selectedDoor);
		}
		if (selectedFurniture) {
			highlightFurniture(ctx, selectedFurniture);
		}
	};

	const drawGrid = (ctx: CanvasRenderingContext2D) => {
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 0.5;

		// Calculate grid spacing in world coordinates
		const worldGridSize = GRID_SIZE;
		const screenGridSize = worldGridSize * camera.zoom;

		// Only draw grid if it's not too dense or too sparse
		if (screenGridSize < 4 || screenGridSize > 200) return;

		// Calculate world bounds visible on screen
		const topLeft = screenToWorld(0, 0);
		const bottomRight = screenToWorld(CANVAS_WIDTH, CANVAS_HEIGHT);

		// Calculate grid line positions in world coordinates
		const startX = Math.floor(topLeft.x / worldGridSize) * worldGridSize;
		const endX = Math.ceil(bottomRight.x / worldGridSize) * worldGridSize;
		const startY = Math.floor(topLeft.y / worldGridSize) * worldGridSize;
		const endY = Math.ceil(bottomRight.y / worldGridSize) * worldGridSize;

		// Draw vertical grid lines
		for (let worldX = startX; worldX <= endX; worldX += worldGridSize) {
			const screenPos = worldToScreen(worldX, 0);
			if (screenPos.x >= 0 && screenPos.x <= CANVAS_WIDTH) {
				ctx.beginPath();
				ctx.moveTo(screenPos.x, 0);
				ctx.lineTo(screenPos.x, CANVAS_HEIGHT);
				ctx.stroke();
			}
		}

		// Draw horizontal grid lines
		for (let worldY = startY; worldY <= endY; worldY += worldGridSize) {
			const screenPos = worldToScreen(0, worldY);
			if (screenPos.y >= 0 && screenPos.y <= CANVAS_HEIGHT) {
				ctx.beginPath();
				ctx.moveTo(0, screenPos.y);
				ctx.lineTo(CANVAS_WIDTH, screenPos.y);
				ctx.stroke();
			}
		}
	};

	const drawCenterAxes = (ctx: CanvasRenderingContext2D) => {
		ctx.strokeStyle = '#ff6b6b';
		ctx.lineWidth = 2;

		// Get screen coordinates for world origin (0,0)
		const origin = worldToScreen(0, 0);

		// Only draw axes if they're visible on screen
		if (origin.x >= 0 && origin.x <= CANVAS_WIDTH) {
			// Vertical center line (X=0 in SpriteKit coordinates)
			ctx.beginPath();
			ctx.moveTo(origin.x, 0);
			ctx.lineTo(origin.x, CANVAS_HEIGHT);
			ctx.stroke();
		}

		if (origin.y >= 0 && origin.y <= CANVAS_HEIGHT) {
			// Horizontal center line (Y=0 in SpriteKit coordinates)
			ctx.beginPath();
			ctx.moveTo(0, origin.y);
			ctx.lineTo(CANVAS_WIDTH, origin.y);
			ctx.stroke();
		}

		// Center point marker (only if visible)
		if (origin.x >= -10 && origin.x <= CANVAS_WIDTH + 10 &&
			origin.y >= -10 && origin.y <= CANVAS_HEIGHT + 10) {
			ctx.fillStyle = '#ff6b6b';
			ctx.beginPath();
			ctx.arc(origin.x, origin.y, 4 * camera.zoom, 0, 2 * Math.PI);
			ctx.fill();

			// Label the center point
			ctx.fillStyle = '#ff6b6b';
			ctx.font = `${14 * camera.zoom}px Arial`;
			ctx.textAlign = 'left';
			ctx.fillText('(0,0)', origin.x + 8 * camera.zoom, origin.y - 8 * camera.zoom);
		}
	};

	const drawRoom = (ctx: CanvasRenderingContext2D, room: RoomTemplate) => {
		// Convert room bounds to screen coordinates
		const topLeft = worldToScreen(room.startX, room.startY);
		const bottomRight = worldToScreen(room.endX, room.endY);

		const screenWidth = bottomRight.x - topLeft.x;
		const screenHeight = bottomRight.y - topLeft.y;

		// Skip drawing if room is not visible
		if (topLeft.x > CANVAS_WIDTH || bottomRight.x < 0 ||
			topLeft.y > CANVAS_HEIGHT || bottomRight.y < 0) {
			return;
		}

		// Room background
		ctx.fillStyle = room.type === 'corridor' ? '#4a5568' : '#2d3748';
		ctx.fillRect(topLeft.x, topLeft.y, screenWidth, screenHeight);

		// Room border
		ctx.strokeStyle = room.locked ? '#e53e3e' : '#718096';
		ctx.lineWidth = Math.max(1, 2 * camera.zoom);
		ctx.strokeRect(topLeft.x, topLeft.y, screenWidth, screenHeight);

		// Room label (only if room is large enough on screen)
		if (screenWidth > 50 && screenHeight > 20) {
			ctx.fillStyle = '#fff';
			ctx.font = `${Math.max(8, 12 * camera.zoom)}px Arial`;
			ctx.textAlign = 'center';
			const centerX = topLeft.x + screenWidth / 2;
			const centerY = topLeft.y + screenHeight / 2;
			ctx.fillText(room.name, centerX, centerY);
			ctx.fillText(`${room.id}`, centerX, centerY + 15 * camera.zoom);
		}
	};

	const drawDoor = (ctx: CanvasRenderingContext2D, door: DoorTemplate) => {
		// Convert door position to screen coordinates
		const screenPos = worldToScreen(door.x, door.y);

		// Skip drawing if door is not visible
		const maxSize = Math.max(door.width, door.height) * camera.zoom;
		if (screenPos.x < -maxSize || screenPos.x > CANVAS_WIDTH + maxSize ||
			screenPos.y < -maxSize || screenPos.y > CANVAS_HEIGHT + maxSize) {
			return;
		}

		const screenWidth = door.width * camera.zoom;
		const screenHeight = door.height * camera.zoom;
		const halfWidth = screenWidth / 2;
		const halfHeight = screenHeight / 2;

		ctx.save();
		ctx.translate(screenPos.x, screenPos.y);
		ctx.rotate((door.rotation * Math.PI) / 180);

		// Door color based on state
		let doorColor = '#8b5cf6'; // purple for closed
		if (door.state === 'opened') doorColor = '#10b981'; // green
		if (door.state === 'locked') doorColor = '#ef4444'; // red

		ctx.fillStyle = doorColor;
		ctx.fillRect(-halfWidth, -halfHeight, screenWidth, screenHeight);

		ctx.strokeStyle = '#000';
		ctx.lineWidth = Math.max(1, 1 * camera.zoom);
		ctx.strokeRect(-halfWidth, -halfHeight, screenWidth, screenHeight);

		ctx.restore();
	};

	const drawFurniture = (ctx: CanvasRenderingContext2D, item: RoomFurniture) => {
		// Get the room this furniture belongs to
		const room = floorRooms.find(r => r.id === item.room_id);
		if (!room) {
			console.warn('Furniture room not found:', item.room_id, 'for furniture:', item.id);
			return;
		}

		// Convert room-relative coordinates to world coordinates
		const worldCoords = roomToWorldCoordinates(item, room);

		// Convert world coordinates to screen coordinates
		const screenPos = worldToScreen(worldCoords.worldX, worldCoords.worldY);

		// Skip drawing if furniture is not visible
		const maxSize = Math.max(item.width, item.height) * camera.zoom;
		if (screenPos.x < -maxSize || screenPos.x > CANVAS_WIDTH + maxSize ||
			screenPos.y < -maxSize || screenPos.y > CANVAS_HEIGHT + maxSize) {
			return;
		}



		const screenWidth = item.width * camera.zoom;
		const screenHeight = item.height * camera.zoom;

		ctx.save();
		ctx.translate(screenPos.x, screenPos.y);
		ctx.rotate((item.rotation * Math.PI) / 180);

		// Furniture color based on type
		let furnitureColor = '#9333ea'; // purple for general furniture
		if (item.furniture_type === 'stargate') furnitureColor = '#059669'; // green for stargate
		if (item.furniture_type === 'console') furnitureColor = '#dc2626'; // red for console
		if (item.furniture_type === 'bed') furnitureColor = '#7c3aed'; // purple for bed

		ctx.fillStyle = furnitureColor;
		ctx.fillRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);

		ctx.strokeStyle = '#000';
		ctx.lineWidth = Math.max(1, 1 * camera.zoom);
		ctx.strokeRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);

		// Add furniture label (only if large enough)
		if (screenWidth > 20 && screenHeight > 10) {
			ctx.fillStyle = '#fff';
			ctx.font = `${Math.max(8, 10 * camera.zoom)}px Arial`;
			ctx.textAlign = 'center';
			ctx.fillText(item.furniture_type, 0, 4 * camera.zoom);
		}

		ctx.restore();
	};

	const highlightRoom = (ctx: CanvasRenderingContext2D, room: RoomTemplate) => {
		// Convert room bounds to screen coordinates
		const topLeft = worldToScreen(room.startX, room.startY);
		const bottomRight = worldToScreen(room.endX, room.endY);

		const screenWidth = bottomRight.x - topLeft.x;
		const screenHeight = bottomRight.y - topLeft.y;

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = Math.max(2, 3 * camera.zoom);
		ctx.setLineDash([5 * camera.zoom, 5 * camera.zoom]);
		ctx.strokeRect(topLeft.x - 2 * camera.zoom, topLeft.y - 2 * camera.zoom,
					   screenWidth + 4 * camera.zoom, screenHeight + 4 * camera.zoom);
		ctx.setLineDash([]);
	};

	const highlightDoor = (ctx: CanvasRenderingContext2D, door: DoorTemplate) => {
		// Convert door position to screen coordinates
		const screenPos = worldToScreen(door.x, door.y);

		const screenWidth = door.width * camera.zoom;
		const screenHeight = door.height * camera.zoom;
		const halfWidth = screenWidth / 2 + 2 * camera.zoom;
		const halfHeight = screenHeight / 2 + 2 * camera.zoom;

		ctx.save();
		ctx.translate(screenPos.x, screenPos.y);
		ctx.rotate((door.rotation * Math.PI) / 180);

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = Math.max(1, 2 * camera.zoom);
		ctx.setLineDash([3 * camera.zoom, 3 * camera.zoom]);
		ctx.strokeRect(-halfWidth, -halfHeight, screenWidth + 4 * camera.zoom, screenHeight + 4 * camera.zoom);
		ctx.setLineDash([]);

		ctx.restore();
	};

	const highlightFurniture = (ctx: CanvasRenderingContext2D, item: RoomFurniture) => {
		// Get the room this furniture belongs to
		const room = floorRooms.find(r => r.id === item.room_id);
		if (!room) return;

		// Convert room-relative coordinates to world coordinates
		const worldCoords = roomToWorldCoordinates(item, room);

		// Convert world coordinates to screen coordinates
		const screenPos = worldToScreen(worldCoords.worldX, worldCoords.worldY);

		const screenWidth = item.width * camera.zoom;
		const screenHeight = item.height * camera.zoom;
		const padding = 2 * camera.zoom;

		ctx.save();
		ctx.translate(screenPos.x, screenPos.y);
		ctx.rotate((item.rotation * Math.PI) / 180);

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = Math.max(1, 2 * camera.zoom);
		ctx.setLineDash([3 * camera.zoom, 3 * camera.zoom]);
		ctx.strokeRect(-(screenWidth / 2 + padding), -(screenHeight / 2 + padding),
					   screenWidth + 2 * padding, screenHeight + 2 * padding);
		ctx.setLineDash([]);

		ctx.restore();
	};

	const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
		event.preventDefault();

		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		// Scale mouse coordinates to match canvas internal coordinates
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		// Get world position before zoom
		const worldBeforeZoom = screenToWorld(screenX, screenY);

		// Calculate zoom change
		const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * zoomFactor));

		// Calculate world position after zoom using the new zoom level
		const worldAfterZoom = {
			x: camera.x + (screenX - CANVAS_WIDTH / 2) / newZoom,
			y: camera.y + (screenY - CANVAS_HEIGHT / 2) / newZoom,
		};

		// Update camera with new zoom and adjusted position in one call
		setCamera({
			x: camera.x + (worldBeforeZoom.x - worldAfterZoom.x),
			y: camera.y + (worldBeforeZoom.y - worldAfterZoom.y),
			zoom: newZoom,
		});
	};

	const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		// Scale mouse coordinates to match canvas internal coordinates
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		if (event.button === 1 || (event.button === 0 && event.ctrlKey) || event.button === 0) {
			// Middle mouse button, Ctrl+Left mouse button, or regular left mouse button for panning
			event.preventDefault();
			setIsMouseDown(true);
			setDragState({
				isDragging: false, // Don't set to true immediately, wait for movement
				dragType: 'camera',
				dragId: null,
				startX: screenX,
				startY: screenY,
				currentX: screenX,
				currentY: screenY,
			});
		}
	};

	const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		// Scale mouse coordinates to match canvas internal coordinates
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		// If mouse is down but not yet dragging, check if we should start dragging
		if (isMouseDown && !dragState.isDragging && dragState.dragType === 'camera') {
			const deltaX = screenX - dragState.startX;
			const deltaY = screenY - dragState.startY;
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			// Start dragging if mouse moved more than 3 pixels
			if (distance > 3) {
				setDragState(prev => ({
					...prev,
					isDragging: true,
					currentX: screenX,
					currentY: screenY,
				}));
			}
			return;
		}

		// If actively dragging, update camera position
		if (dragState.isDragging && dragState.dragType === 'camera') {
			// Calculate pan delta in screen space
			const deltaX = screenX - dragState.currentX;
			const deltaY = screenY - dragState.currentY;

			// Convert to world space delta (inverse of zoom)
			const worldDeltaX = -deltaX / camera.zoom;
			const worldDeltaY = -deltaY / camera.zoom;

			// Update camera position
			setCamera(prev => ({
				...prev,
				x: prev.x + worldDeltaX,
				y: prev.y + worldDeltaY,
			}));

			// Update drag state
			setDragState(prev => ({
				...prev,
				currentX: screenX,
				currentY: screenY,
			}));
		}
	};

	const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
		setIsMouseDown(false);

		if (dragState.isDragging && dragState.dragType === 'camera') {
			setDragState({
				isDragging: false,
				dragType: 'none',
				dragId: null,
				startX: 0,
				startY: 0,
				currentX: 0,
				currentY: 0,
			});
			return;
		}

		// If not dragging the camera, handle as a click
		if (!dragState.isDragging) {
			handleCanvasClick(event);
		}

		// Reset drag state
		setDragState({
			isDragging: false,
			dragType: 'none',
			dragId: null,
			startX: 0,
			startY: 0,
			currentX: 0,
			currentY: 0,
		});
	};

	const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		// Scale mouse coordinates to match canvas internal coordinates
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		// Convert screen coordinates to world coordinates
		const worldPos = screenToWorld(screenX, screenY);

		// Check if clicked on furniture first (highest priority)
		const clickedFurniture = floorFurniture.find(item => {
			const room = floorRooms.find(r => r.id === item.room_id);
			if (!room) return false;

			const worldCoords = roomToWorldCoordinates(item, room);
			const halfWidth = item.width / 2;
			const halfHeight = item.height / 2;

			return worldPos.x >= worldCoords.worldX - halfWidth &&
				   worldPos.x <= worldCoords.worldX + halfWidth &&
				   worldPos.y >= worldCoords.worldY - halfHeight &&
				   worldPos.y <= worldCoords.worldY + halfHeight;
		});

		if (clickedFurniture) {
			setSelectedFurniture(clickedFurniture);
			setSelectedDoor(null);
			setSelectedRoom(null);
			return;
		}

		// Check if clicked on a door (smaller hit targets)
		const clickedDoor = floorDoors.find(door => {
			const halfWidth = door.width / 2;
			const halfHeight = door.height / 2;
			return worldPos.x >= door.x - halfWidth && worldPos.x <= door.x + halfWidth &&
				   worldPos.y >= door.y - halfHeight && worldPos.y <= door.y + halfHeight;
		});

		if (clickedDoor) {
			setSelectedDoor(clickedDoor);
			setSelectedRoom(null);
			setSelectedFurniture(null);
			return;
		}

		// Check if clicked on a room
		const clickedRoom = floorRooms.find(room => {
			return worldPos.x >= room.startX && worldPos.x <= room.endX &&
				   worldPos.y >= room.startY && worldPos.y <= room.endY;
		});

		if (clickedRoom) {
			setSelectedRoom(clickedRoom);
			setSelectedDoor(null);
			setSelectedFurniture(null);
		} else {
			setSelectedRoom(null);
			setSelectedDoor(null);
			setSelectedFurniture(null);
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
						<Button
							variant="success"
							onClick={() => {
								if (!selectedRoom) {
									toast.error('Please select a room first');
									return;
								}
								// TODO: Add furniture creation modal
								toast.info('Furniture creation coming soon');
							}}
							disabled={!selectedRoom}
						>
							<FaPlus /> Add Furniture
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

					{/* Selected Furniture Properties */}
					{selectedFurniture && (
						<Card className="mb-3">
							<Card.Header>Selected Furniture</Card.Header>
							<Card.Body>
								<p><strong>{selectedFurniture.name}</strong></p>
								<p>ID: <code>{selectedFurniture.id}</code></p>
								<p>Type: <span className="badge bg-info">{selectedFurniture.furniture_type}</span></p>
								<p>Room Position: ({selectedFurniture.x}, {selectedFurniture.y})</p>
								<p>Size: {selectedFurniture.width} × {selectedFurniture.height}</p>
								<p>Active: <span className={`badge bg-${selectedFurniture.active ? 'success' : 'danger'}`}>{selectedFurniture.active ? 'Yes' : 'No'}</span></p>
								<div className="d-grid gap-2">
									<Button
										size="sm"
										variant="outline-warning"
										onClick={() => {
											// TODO: Add furniture editing modal
											toast.info('Furniture editing coming soon');
										}}
									>
										<FaEdit /> Edit
									</Button>
									<Button
										size="sm"
										variant="outline-danger"
										onClick={async () => {
											if (!confirm('Are you sure you want to delete this furniture?')) return;
											try {
												await adminService.deleteFurniture(selectedFurniture.id);
												toast.success('Furniture deleted successfully');
												setSelectedFurniture(null);
												loadData();
											} catch (err: any) {
												toast.error(err.message || 'Failed to delete furniture');
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
							<p>Furniture: {floorFurniture.length}</p>
						</Card.Body>
					</Card>
				</div>

				{/* Right Panel - Canvas */}
				<div className="flex-grow-1" style={{ padding: '1rem' }}>
					{/* Camera Controls */}
					<div className="mb-2 d-flex align-items-center gap-2">
						<small className="text-muted">
							Camera: ({camera.x.toFixed(0)}, {camera.y.toFixed(0)}) | Zoom: {(camera.zoom * 100).toFixed(0)}%
						</small>
						<Button
							size="sm"
							variant="outline-secondary"
							onClick={() => setCamera({ x: 0, y: 0, zoom: 1.0 })}
						>
							Reset View
						</Button>
						<Button
							size="sm"
							variant="outline-secondary"
							onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom * 1.5) }))}
						>
							Zoom In
						</Button>
						<Button
							size="sm"
							variant="outline-secondary"
							onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom / 1.5) }))}
						>
							Zoom Out
						</Button>
					</div>
					<canvas
						ref={canvasRef}
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						style={{
							border: '1px solid #ccc',
							backgroundColor: '#1a202c',
							cursor: dragState.isDragging && dragState.dragType === 'camera' ? 'grabbing' :
								isMouseDown ? 'grabbing' : 'grab',
							maxWidth: '100%',
							height: 'auto',
						}}
						onWheel={handleCanvasWheel}
						onMouseDown={handleCanvasMouseDown}
						onMouseMove={handleCanvasMouseMove}
						onMouseUp={handleCanvasMouseUp}
						onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
					/>
					<small className="text-muted d-block mt-1">
						<strong>Controls:</strong> Mouse wheel to zoom, click and drag to pan<br/>
						<strong>Keyboard:</strong> WASD/Arrow keys to move, +/- to zoom, 0 to reset view
					</small>
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
