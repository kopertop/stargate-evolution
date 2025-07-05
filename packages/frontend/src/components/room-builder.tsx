import { RoomTemplate, DoorTemplate, RoomFurniture, roomToWorldCoordinates, worldToRoomCoordinates } from '@stargate/common';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Card, Form, Modal, Table, Nav, Tab, Alert, InputGroup, OverlayTrigger, Tooltip, Dropdown } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { adminService } from '../services/admin-service';

interface RoomBuilderProps {
	selectedFloor: number;
	onFloorChange: (floor: number) => void;
}

type DragState = {
	isDragging: boolean;
	dragType: 'room' | 'door' | 'furniture' | 'camera' | 'resize' | 'none';
	dragId: string | null;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
	// Store original positions when drag starts
	originalRoomPosition?: { startX: number; endX: number; startY: number; endY: number };
	originalDoorPosition?: { x: number; y: number };
	originalFurniturePosition?: { x: number; y: number };
	// Resize handle information
	resizeHandle?: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
	resizeRoomId?: string;
};

type ContextMenu = {
	visible: boolean;
	x: number;
	y: number;
	type: 'empty' | 'room' | 'door' | 'furniture';
	targetId?: string;
	worldX: number;
	worldY: number;
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
	const [showFurnitureModal, setShowFurnitureModal] = useState(false);
	const [showInspectorModal, setShowInspectorModal] = useState(false);
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
	const [contextMenu, setContextMenu] = useState<ContextMenu>({
		visible: false,
		x: 0,
		y: 0,
		type: 'empty',
		worldX: 0,
		worldY: 0,
	});
	const [editingFurniture, setEditingFurniture] = useState<Partial<RoomFurniture>>({});
	const [inspectorTarget, setInspectorTarget] = useState<{
		type: 'room' | 'door' | 'furniture';
		data: any;
	} | null>(null);
	const [isSnapped, setIsSnapped] = useState(false);

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

			// Inspector shortcut (Cmd+I or Ctrl+I)
			if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
				event.preventDefault();
				handleOpenInspector();
			}

			// Escape to close context menu and modals
			if (event.key === 'Escape') {
				setContextMenu(prev => ({ ...prev, visible: false }));
				setShowInspectorModal(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [camera, selectedRoom, selectedDoor, selectedFurniture]);

	useEffect(() => {
		drawCanvas();
	}, [floorRooms, floorDoors, floorFurniture, selectedRoom, selectedDoor, selectedFurniture, dragState, camera]);

	// Hide context menu when clicking elsewhere
	useEffect(() => {
		const handleClickOutside = () => {
			setContextMenu(prev => ({ ...prev, visible: false }));
		};

		if (contextMenu.visible) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	}, [contextMenu.visible]);

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
			// Draw resize handles for selected room
			drawResizeHandles(ctx, selectedRoom);
		}
		if (selectedDoor) {
			highlightDoor(ctx, selectedDoor);
		}
		if (selectedFurniture) {
			highlightFurniture(ctx, selectedFurniture);
		}

		// Show snap indicator when snapping is active
		if (isSnapped && selectedRoom) {
			ctx.strokeStyle = '#10b981'; // Green color for snap indicator
			ctx.lineWidth = 3;
			ctx.setLineDash([5, 5]); // Dashed line

			const screen = worldToScreen(
				(selectedRoom.startX + selectedRoom.endX) / 2,
				(selectedRoom.startY + selectedRoom.endY) / 2,
			);

			// Draw a circle around the room to indicate snapping
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 80 * camera.zoom, 0, 2 * Math.PI);
			ctx.stroke();

			// Reset line dash
			ctx.setLineDash([]);
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

		// Use different colors for different states
		const isDragging = dragState.isDragging && dragState.dragType === 'room' && dragState.dragId === room.id;
		ctx.strokeStyle = isDragging ? '#ff6b6b' : '#fbbf24'; // Red when dragging, gold when selected
		ctx.lineWidth = Math.max(2, isDragging ? 4 * camera.zoom : 3 * camera.zoom);
		ctx.setLineDash(isDragging ? [3 * camera.zoom, 3 * camera.zoom] : [5 * camera.zoom, 5 * camera.zoom]);
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

		// Use different colors for different states
		const isDragging = dragState.isDragging && dragState.dragType === 'door' && dragState.dragId === door.id;
		ctx.strokeStyle = isDragging ? '#ff6b6b' : '#fbbf24'; // Red when dragging, gold when selected
		ctx.lineWidth = Math.max(1, isDragging ? 3 * camera.zoom : 2 * camera.zoom);
		ctx.setLineDash(isDragging ? [2 * camera.zoom, 2 * camera.zoom] : [3 * camera.zoom, 3 * camera.zoom]);
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

		// Use different colors for different states
		const isDragging = dragState.isDragging && dragState.dragType === 'furniture' && dragState.dragId === item.id;
		ctx.strokeStyle = isDragging ? '#ff6b6b' : '#fbbf24'; // Red when dragging, gold when selected
		ctx.lineWidth = Math.max(1, isDragging ? 3 * camera.zoom : 2 * camera.zoom);
		ctx.setLineDash(isDragging ? [2 * camera.zoom, 2 * camera.zoom] : [3 * camera.zoom, 3 * camera.zoom]);
		ctx.strokeRect(-(screenWidth / 2 + padding), -(screenHeight / 2 + padding),
					   screenWidth + 2 * padding, screenHeight + 2 * padding);
		ctx.setLineDash([]);

		ctx.restore();
	};

	const drawResizeHandles = (ctx: CanvasRenderingContext2D, room: RoomTemplate) => {
		// Convert room bounds to screen coordinates
		const topLeft = worldToScreen(room.startX, room.startY);
		const bottomRight = worldToScreen(room.endX, room.endY);

		const handleSize = Math.max(6, 8 * camera.zoom);
		const halfHandle = handleSize / 2;

		// Handle positions (screen coordinates)
		const handles = {
			nw: { x: topLeft.x, y: topLeft.y },
			ne: { x: bottomRight.x, y: topLeft.y },
			sw: { x: topLeft.x, y: bottomRight.y },
			se: { x: bottomRight.x, y: bottomRight.y },
			n: { x: (topLeft.x + bottomRight.x) / 2, y: topLeft.y },
			s: { x: (topLeft.x + bottomRight.x) / 2, y: bottomRight.y },
			e: { x: bottomRight.x, y: (topLeft.y + bottomRight.y) / 2 },
			w: { x: topLeft.x, y: (topLeft.y + bottomRight.y) / 2 },
		};

		// Draw resize handles
		ctx.fillStyle = '#ffffff';
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = Math.max(1, 1 * camera.zoom);

		for (const [handleType, pos] of Object.entries(handles)) {
			// Highlight the handle being dragged
			if (dragState.isDragging && dragState.dragType === 'resize' && dragState.resizeHandle === handleType) {
				ctx.fillStyle = '#ff6b6b';
			} else {
				ctx.fillStyle = '#ffffff';
			}

			ctx.fillRect(pos.x - halfHandle, pos.y - halfHandle, handleSize, handleSize);
			ctx.strokeRect(pos.x - halfHandle, pos.y - halfHandle, handleSize, handleSize);
		}
	};

	const getResizeHandle = (screenX: number, screenY: number, room: RoomTemplate): 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null => {
		// Convert room bounds to screen coordinates
		const topLeft = worldToScreen(room.startX, room.startY);
		const bottomRight = worldToScreen(room.endX, room.endY);

		const handleSize = Math.max(6, 8 * camera.zoom);
		const halfHandle = handleSize / 2;
		const tolerance = halfHandle + 2; // Extra tolerance for easier clicking

		// Handle positions (screen coordinates)
		const handles = {
			nw: { x: topLeft.x, y: topLeft.y },
			ne: { x: bottomRight.x, y: topLeft.y },
			sw: { x: topLeft.x, y: bottomRight.y },
			se: { x: bottomRight.x, y: bottomRight.y },
			n: { x: (topLeft.x + bottomRight.x) / 2, y: topLeft.y },
			s: { x: (topLeft.x + bottomRight.x) / 2, y: bottomRight.y },
			e: { x: bottomRight.x, y: (topLeft.y + bottomRight.y) / 2 },
			w: { x: topLeft.x, y: (topLeft.y + bottomRight.y) / 2 },
		};

		// Check each handle
		for (const [handleType, pos] of Object.entries(handles)) {
			if (Math.abs(screenX - pos.x) <= tolerance && Math.abs(screenY - pos.y) <= tolerance) {
				return handleType as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
			}
		}

		return null;
	};

	const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
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
		return false;
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

		// Convert screen coordinates to world coordinates
		const worldPos = screenToWorld(screenX, screenY);

		// Check if we're clicking on a selected item to start dragging it
		let dragType: 'room' | 'door' | 'furniture' | 'camera' | 'resize' = 'camera';
		let dragId: string | null = null;
		let resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | undefined;

		// Check if clicking on selected furniture (highest priority)
		if (selectedFurniture) {
			const room = floorRooms.find(r => r.id === selectedFurniture.room_id);
			if (room) {
				const worldCoords = roomToWorldCoordinates(selectedFurniture, room);
				const halfWidth = selectedFurniture.width / 2;
				const halfHeight = selectedFurniture.height / 2;

				if (worldPos.x >= worldCoords.worldX - halfWidth &&
					worldPos.x <= worldCoords.worldX + halfWidth &&
					worldPos.y >= worldCoords.worldY - halfHeight &&
					worldPos.y <= worldCoords.worldY + halfHeight) {
					dragType = 'furniture';
					dragId = selectedFurniture.id;
				}
			}
		}

		// Check if clicking on selected door
		if (dragType === 'camera' && selectedDoor) {
			const halfWidth = selectedDoor.width / 2;
			const halfHeight = selectedDoor.height / 2;
			if (worldPos.x >= selectedDoor.x - halfWidth && worldPos.x <= selectedDoor.x + halfWidth &&
				worldPos.y >= selectedDoor.y - halfHeight && worldPos.y <= selectedDoor.y + halfHeight) {
				dragType = 'door';
				dragId = selectedDoor.id;
			}
		}

		// Check if clicking on selected room (first check for resize handles, then room drag)
		if (dragType === 'camera' && selectedRoom) {
			// Check for resize handle first (higher priority)
			const detectedHandle = getResizeHandle(screenX, screenY, selectedRoom);
			if (detectedHandle) {
				dragType = 'resize';
				dragId = selectedRoom.id;
				resizeHandle = detectedHandle;
			} else if (worldPos.x >= selectedRoom.startX && worldPos.x <= selectedRoom.endX &&
					   worldPos.y >= selectedRoom.startY && worldPos.y <= selectedRoom.endY) {
				// If not on resize handle, check for room drag
				dragType = 'room';
				dragId = selectedRoom.id;
			}
		}

		if (event.button === 1 || (event.button === 0 && event.ctrlKey) || event.button === 0) {
			// Middle mouse button, Ctrl+Left mouse button, or regular left mouse button
			event.preventDefault();
			setIsMouseDown(true);

			// Store original positions based on drag type
			let originalRoomPosition: { startX: number; endX: number; startY: number; endY: number } | undefined;
			let originalDoorPosition: { x: number; y: number } | undefined;
			let originalFurniturePosition: { x: number; y: number } | undefined;

			if (dragType === 'room' && selectedRoom) {
				originalRoomPosition = {
					startX: selectedRoom.startX,
					endX: selectedRoom.endX,
					startY: selectedRoom.startY,
					endY: selectedRoom.endY,
				};
			} else if (dragType === 'door' && selectedDoor) {
				originalDoorPosition = {
					x: selectedDoor.x,
					y: selectedDoor.y,
				};
			} else if (dragType === 'furniture' && selectedFurniture) {
				originalFurniturePosition = {
					x: selectedFurniture.x,
					y: selectedFurniture.y,
				};
			}

			setDragState({
				isDragging: false, // Don't set to true immediately, wait for movement
				dragType,
				dragId,
				startX: screenX,
				startY: screenY,
				currentX: screenX,
				currentY: screenY,
				originalRoomPosition,
				originalDoorPosition,
				originalFurniturePosition,
				resizeHandle,
				resizeRoomId: dragType === 'resize' && dragId ? dragId : undefined,
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
		if (isMouseDown && !dragState.isDragging && dragState.dragType !== 'none') {
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

		// If actively dragging, handle different drag types
		if (dragState.isDragging) {
			if (dragState.dragType === 'camera') {
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
			} else if (dragState.dragType === 'room' && selectedRoom && dragState.dragId === selectedRoom.id && dragState.originalRoomPosition) {
				// Move room - calculate world space delta from original drag start position
				const worldStart = screenToWorld(dragState.startX, dragState.startY);
				const worldCurrent = screenToWorld(screenX, screenY);
				const worldDeltaX = worldCurrent.x - worldStart.x;
				const worldDeltaY = worldCurrent.y - worldStart.y;

				// Calculate new room position based on stored original position + delta
				let updatedRoom = {
					...selectedRoom,
					startX: dragState.originalRoomPosition.startX + worldDeltaX,
					endX: dragState.originalRoomPosition.endX + worldDeltaX,
					startY: dragState.originalRoomPosition.startY + worldDeltaY,
					endY: dragState.originalRoomPosition.endY + worldDeltaY,
				};

				// Apply room-to-room snapping first
				const otherRooms = floorRooms.filter(r => r.id !== selectedRoom.id);
				const snapResult = findSnapPosition(updatedRoom, otherRooms);
				if (snapResult.hasSnapped) {
					updatedRoom = snapResult.snappedRoom;
					setIsSnapped(true);
				} else {
					// If no room snapping, apply grid snapping as fallback
					const gridSnappedStartX = Math.round(updatedRoom.startX / GRID_SIZE) * GRID_SIZE;
					const gridSnappedStartY = Math.round(updatedRoom.startY / GRID_SIZE) * GRID_SIZE;
					const roomWidth = updatedRoom.endX - updatedRoom.startX;
					const roomHeight = updatedRoom.endY - updatedRoom.startY;

					updatedRoom = {
						...updatedRoom,
						startX: gridSnappedStartX,
						endX: gridSnappedStartX + roomWidth,
						startY: gridSnappedStartY,
						endY: gridSnappedStartY + roomHeight,
					};
					setIsSnapped(false);
				}

				setSelectedRoom(updatedRoom);
				// Update in rooms array for immediate visual feedback
				setRooms(prev => prev.map(r => r.id === selectedRoom.id ? updatedRoom : r));
			} else if (dragState.dragType === 'door' && selectedDoor && dragState.dragId === selectedDoor.id && dragState.originalDoorPosition) {
				// Move door - calculate world space delta from original drag start position
				const worldStart = screenToWorld(dragState.startX, dragState.startY);
				const worldCurrent = screenToWorld(screenX, screenY);
				const worldDeltaX = worldCurrent.x - worldStart.x;
				const worldDeltaY = worldCurrent.y - worldStart.y;

				// Snap to grid (16-point grid for doors)
				const snappedDeltaX = Math.round(worldDeltaX / 16) * 16;
				const snappedDeltaY = Math.round(worldDeltaY / 16) * 16;

				// Update door position based on stored original position + snapped delta
				const updatedDoor = {
					...selectedDoor,
					x: dragState.originalDoorPosition.x + snappedDeltaX,
					y: dragState.originalDoorPosition.y + snappedDeltaY,
				};

				setSelectedDoor(updatedDoor);
				// Update in doors array for immediate visual feedback
				setDoors(prev => prev.map(d => d.id === selectedDoor.id ? updatedDoor : d));
			} else if (dragState.dragType === 'furniture' && selectedFurniture && dragState.dragId === selectedFurniture.id && dragState.originalFurniturePosition) {
				// Move furniture - calculate world space delta from original drag start position
				const worldStart = screenToWorld(dragState.startX, dragState.startY);
				const worldCurrent = screenToWorld(screenX, screenY);
				const worldDeltaX = worldCurrent.x - worldStart.x;
				const worldDeltaY = worldCurrent.y - worldStart.y;

				// Find the room this furniture belongs to
				const room = floorRooms.find(r => r.id === selectedFurniture.room_id);
				if (room) {
					// Convert world delta to room-relative delta
					const roomRelativeDeltaX = worldDeltaX;
					const roomRelativeDeltaY = worldDeltaY;

					// Snap to grid (8-point grid for furniture)
					const snappedDeltaX = Math.round(roomRelativeDeltaX / 8) * 8;
					const snappedDeltaY = Math.round(roomRelativeDeltaY / 8) * 8;

					// Update furniture position based on stored original position + snapped delta
					const updatedFurniture = {
						...selectedFurniture,
						x: dragState.originalFurniturePosition.x + snappedDeltaX,
						y: dragState.originalFurniturePosition.y + snappedDeltaY,
					};

					setSelectedFurniture(updatedFurniture);
					// Update in furniture array for immediate visual feedback
					setFurniture(prev => prev.map(f => f.id === selectedFurniture.id ? updatedFurniture : f));
				}
			} else if (dragState.dragType === 'resize' && selectedRoom && dragState.resizeRoomId === selectedRoom.id && dragState.resizeHandle && dragState.originalRoomPosition) {
				// Resize room - calculate world space delta from original drag start position
				const worldStart = screenToWorld(dragState.startX, dragState.startY);
				const worldCurrent = screenToWorld(screenX, screenY);
				const worldDeltaX = worldCurrent.x - worldStart.x;
				const worldDeltaY = worldCurrent.y - worldStart.y;

				// Calculate new room bounds based on resize handle and original position
				let newStartX = dragState.originalRoomPosition.startX;
				let newEndX = dragState.originalRoomPosition.endX;
				let newStartY = dragState.originalRoomPosition.startY;
				let newEndY = dragState.originalRoomPosition.endY;

				const handle = dragState.resizeHandle;
				const minSize = GRID_SIZE; // Minimum room size (32 pixels)

				// Apply resize based on handle type
				if (handle.includes('w')) { // west side (left)
					newStartX = dragState.originalRoomPosition.startX + worldDeltaX;
					// Ensure minimum size
					if (newEndX - newStartX < minSize) {
						newStartX = newEndX - minSize;
					}
				}
				if (handle.includes('e')) { // east side (right)
					newEndX = dragState.originalRoomPosition.endX + worldDeltaX;
					// Ensure minimum size
					if (newEndX - newStartX < minSize) {
						newEndX = newStartX + minSize;
					}
				}
				if (handle.includes('n')) { // north side (top)
					newStartY = dragState.originalRoomPosition.startY + worldDeltaY;
					// Ensure minimum size
					if (newEndY - newStartY < minSize) {
						newStartY = newEndY - minSize;
					}
				}
				if (handle.includes('s')) { // south side (bottom)
					newEndY = dragState.originalRoomPosition.endY + worldDeltaY;
					// Ensure minimum size
					if (newEndY - newStartY < minSize) {
						newEndY = newStartY + minSize;
					}
				}

				// Snap to grid
				newStartX = Math.round(newStartX / GRID_SIZE) * GRID_SIZE;
				newEndX = Math.round(newEndX / GRID_SIZE) * GRID_SIZE;
				newStartY = Math.round(newStartY / GRID_SIZE) * GRID_SIZE;
				newEndY = Math.round(newEndY / GRID_SIZE) * GRID_SIZE;

				// Ensure minimum size after snapping
				if (newEndX - newStartX < minSize) {
					if (handle.includes('w')) {
						newStartX = newEndX - minSize;
					} else {
						newEndX = newStartX + minSize;
					}
				}
				if (newEndY - newStartY < minSize) {
					if (handle.includes('n')) {
						newStartY = newEndY - minSize;
					} else {
						newEndY = newStartY + minSize;
					}
				}

				// Create updated room
				const updatedRoom = {
					...selectedRoom,
					startX: newStartX,
					endX: newEndX,
					startY: newStartY,
					endY: newEndY,
				};

				setSelectedRoom(updatedRoom);
				// Update in rooms array for immediate visual feedback
				setRooms(prev => prev.map(r => r.id === selectedRoom.id ? updatedRoom : r));
			}

			// Update current position for tracking purposes only (not used in delta calculations)
			setDragState(prev => ({
				...prev,
				currentX: screenX,
				currentY: screenY,
			}));
		}
	};

	const handleCanvasMouseUp = async (event: React.MouseEvent<HTMLCanvasElement>) => {
		setIsMouseDown(false);

		// If we were dragging an item, save the changes
		if (dragState.isDragging && dragState.dragType !== 'camera') {
			try {
				if (dragState.dragType === 'room' && selectedRoom && dragState.dragId === selectedRoom.id) {
					// Save room position changes
					await adminService.updateRoom(selectedRoom.id, {
						...selectedRoom,
						width: selectedRoom.endX - selectedRoom.startX, // Update legacy width
						height: selectedRoom.endY - selectedRoom.startY, // Update legacy height
					});

					// Check for adjacent rooms and create automatic doors
					const otherRooms = floorRooms.filter(r => r.id !== selectedRoom.id);
					const adjacentRooms = findAdjacentRooms(selectedRoom, otherRooms);

					for (const { room: adjacentRoom, side } of adjacentRooms) {
						await createAutomaticDoor(selectedRoom, adjacentRoom, side);
					}

					toast.success('Room moved successfully');
				} else if (dragState.dragType === 'resize' && selectedRoom && dragState.resizeRoomId === selectedRoom.id) {
					// Save room resize changes
					await adminService.updateRoom(selectedRoom.id, {
						...selectedRoom,
						width: selectedRoom.endX - selectedRoom.startX, // Update legacy width
						height: selectedRoom.endY - selectedRoom.startY, // Update legacy height
					});

					// Check for adjacent rooms and create automatic doors
					const otherRooms = floorRooms.filter(r => r.id !== selectedRoom.id);
					const adjacentRooms = findAdjacentRooms(selectedRoom, otherRooms);

					for (const { room: adjacentRoom, side } of adjacentRooms) {
						await createAutomaticDoor(selectedRoom, adjacentRoom, side);
					}

					toast.success('Room resized successfully');
				} else if (dragState.dragType === 'door' && selectedDoor && dragState.dragId === selectedDoor.id) {
					// Save door position changes
					await adminService.updateDoor(selectedDoor.id, selectedDoor);
					toast.success('Door moved successfully');
				} else if (dragState.dragType === 'furniture' && selectedFurniture && dragState.dragId === selectedFurniture.id) {
					// Save furniture position changes
					await adminService.updateFurniture(selectedFurniture.id, selectedFurniture);
					toast.success('Furniture moved successfully');
				}
			} catch (err: any) {
				toast.error(`Failed to save changes: ${err.message}`);
				// Reload data to revert changes
				loadData();
			}
		}

		// If not dragging, handle as a click
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
			originalRoomPosition: undefined,
			originalDoorPosition: undefined,
			originalFurniturePosition: undefined,
			resizeHandle: undefined,
			resizeRoomId: undefined,
		});
		setIsSnapped(false);
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

	const handleOpenInspector = () => {
		if (selectedRoom) {
			setInspectorTarget({ type: 'room', data: selectedRoom });
			setShowInspectorModal(true);
		} else if (selectedDoor) {
			setInspectorTarget({ type: 'door', data: selectedDoor });
			setShowInspectorModal(true);
		} else if (selectedFurniture) {
			setInspectorTarget({ type: 'furniture', data: selectedFurniture });
			setShowInspectorModal(true);
		} else {
			toast.info('Select an item first to open the inspector');
		}
	};

	const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
		event.preventDefault();

		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		// Convert screen coordinates to world coordinates
		const worldPos = screenToWorld(screenX, screenY);

		// Determine context menu type and target
		let menuType: 'empty' | 'room' | 'door' | 'furniture' = 'empty';
		let targetId: string | undefined;

		// Check if right-clicked on furniture first (highest priority)
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
			menuType = 'furniture';
			targetId = clickedFurniture.id;
			setSelectedFurniture(clickedFurniture);
			setSelectedDoor(null);
			setSelectedRoom(null);
		} else {
			// Check if right-clicked on a door
			const clickedDoor = floorDoors.find(door => {
				const halfWidth = door.width / 2;
				const halfHeight = door.height / 2;
				return worldPos.x >= door.x - halfWidth && worldPos.x <= door.x + halfWidth &&
					   worldPos.y >= door.y - halfHeight && worldPos.y <= door.y + halfHeight;
			});

			if (clickedDoor) {
				menuType = 'door';
				targetId = clickedDoor.id;
				setSelectedDoor(clickedDoor);
				setSelectedRoom(null);
				setSelectedFurniture(null);
			} else {
				// Check if right-clicked on a room
				const clickedRoom = floorRooms.find(room => {
					return worldPos.x >= room.startX && worldPos.x <= room.endX &&
						   worldPos.y >= room.startY && worldPos.y <= room.endY;
				});

				if (clickedRoom) {
					menuType = 'room';
					targetId = clickedRoom.id;
					setSelectedRoom(clickedRoom);
					setSelectedDoor(null);
					setSelectedFurniture(null);
				} else {
					// Clear selections if clicking on empty space
					setSelectedRoom(null);
					setSelectedDoor(null);
					setSelectedFurniture(null);
				}
			}
		}

		// Show context menu at cursor position
		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			type: menuType,
			targetId,
			worldX: worldPos.x,
			worldY: worldPos.y,
		});
	};

	const handleContextMenuAction = (action: string) => {
		setContextMenu(prev => ({ ...prev, visible: false }));

		switch (action) {
		case 'add-room':
			handleCreateRoomAtPosition(contextMenu.worldX, contextMenu.worldY);
			break;
		case 'add-furniture':
			handleCreateFurnitureAtPosition(contextMenu.worldX, contextMenu.worldY);
			break;
		case 'add-door':
			handleCreateDoorAtPosition(contextMenu.worldX, contextMenu.worldY);
			break;
		case 'modify-room':
			if (selectedRoom) {
				setEditingRoom({ ...selectedRoom });
				setShowRoomModal(true);
			}
			break;
		case 'modify-door':
			if (selectedDoor) {
				setEditingDoor({ ...selectedDoor });
				setShowDoorModal(true);
			}
			break;
		case 'modify-furniture':
			if (selectedFurniture) {
				setEditingFurniture({ ...selectedFurniture });
				setShowFurnitureModal(true);
			}
			break;
		case 'remove-furniture':
			handleRemoveFurniture();
			break;
		case 'remove-door':
			handleRemoveDoor();
			break;
		case 'remove-room':
			handleRemoveRoom();
			break;
		case 'inspector':
			handleOpenInspector();
			break;
		}
	};

	const handleCreateRoomAtPosition = (worldX: number, worldY: number) => {
		const newRoomWidth = 128;
		const newRoomHeight = 128;
		let finalX: number, finalY: number;

		// Get existing rooms on the same floor
		const existingRooms = floorRooms;

		if (existingRooms.length > 0) {
			// Find the closest existing room
			const closestRoom = findClosestRoom(worldX, worldY, existingRooms);

			if (closestRoom) {
				// Find the best adjacent position relative to the closest room
				const bestPosition = findBestAdjacentPosition(worldX, worldY, closestRoom, newRoomWidth, newRoomHeight);

				// Snap to grid (ensure room aligns with 32-pixel grid)
				finalX = Math.round(bestPosition.x / GRID_SIZE) * GRID_SIZE;
				finalY = Math.round(bestPosition.y / GRID_SIZE) * GRID_SIZE;

				// Double-check for overlaps after grid snapping
				let finalRoom = {
					startX: finalX,
					endX: finalX + newRoomWidth,
					startY: finalY,
					endY: finalY + newRoomHeight,
				};

				// If the grid-snapped position causes overlap, try adjustments
				if (checkRoomOverlap(finalRoom, existingRooms)) {
					// Try various positions around the closest room in order of preference
					const roomCenterX = (closestRoom.startX + closestRoom.endX) / 2;
					const roomCenterY = (closestRoom.startY + closestRoom.endY) / 2;

					// Calculate click position relative to closest room center to determine preferred direction
					const clickDeltaX = worldX - roomCenterX;
					const clickDeltaY = worldY - roomCenterY;

					// Create list of potential positions, ordered by click preference
					const potentialPositions = [];

					// Determine primary direction based on larger delta
					if (Math.abs(clickDeltaX) > Math.abs(clickDeltaY)) {
						// Horizontal primary
						if (clickDeltaX > 0) {
							// Clicked to the right, prefer east
							potentialPositions.push(
								{ x: closestRoom.endX + 8, y: roomCenterY - newRoomHeight / 2, name: 'east' },
								{ x: closestRoom.startX - 8 - newRoomWidth, y: roomCenterY - newRoomHeight / 2, name: 'west' },
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.endY + 8, name: 'south' },
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.startY - 8 - newRoomHeight, name: 'north' },
							);
						} else {
							// Clicked to the left, prefer west
							potentialPositions.push(
								{ x: closestRoom.startX - 8 - newRoomWidth, y: roomCenterY - newRoomHeight / 2, name: 'west' },
								{ x: closestRoom.endX + 8, y: roomCenterY - newRoomHeight / 2, name: 'east' },
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.endY + 8, name: 'south' },
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.startY - 8 - newRoomHeight, name: 'north' },
							);
						}
					} else {
						// Vertical primary
						if (clickDeltaY > 0) {
							// Clicked above, prefer north
							potentialPositions.push(
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.endY + 8, name: 'south' },
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.startY - 8 - newRoomHeight, name: 'north' },
								{ x: closestRoom.endX + 8, y: roomCenterY - newRoomHeight / 2, name: 'east' },
								{ x: closestRoom.startX - 8 - newRoomWidth, y: roomCenterY - newRoomHeight / 2, name: 'west' },
							);
						} else {
							// Clicked below, prefer south
							potentialPositions.push(
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.startY - 8 - newRoomHeight, name: 'north' },
								{ x: roomCenterX - newRoomWidth / 2, y: closestRoom.endY + 8, name: 'south' },
								{ x: closestRoom.endX + 8, y: roomCenterY - newRoomHeight / 2, name: 'east' },
								{ x: closestRoom.startX - 8 - newRoomWidth, y: roomCenterY - newRoomHeight / 2, name: 'west' },
							);
						}
					}

					// Try each position and use the first one that doesn't overlap
					let foundPosition = false;
					for (const pos of potentialPositions) {
						const testX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
						const testY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;

						const testRoom = {
							startX: testX,
							endX: testX + newRoomWidth,
							startY: testY,
							endY: testY + newRoomHeight,
						};

						if (!checkRoomOverlap(testRoom, existingRooms)) {
							finalX = testX;
							finalY = testY;
							finalRoom = testRoom;
							foundPosition = true;
							break;
						}
					}

					// If still no position found, try expanding search with grid increments
					if (!foundPosition) {
						for (let distance = 2; distance <= 8; distance += 2) {
							for (const direction of ['east', 'west', 'south', 'north']) {
								let testX: number, testY: number;

								switch (direction) {
								case 'east':
									testX = Math.round((closestRoom.endX + distance * GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
									testY = Math.round((roomCenterY - newRoomHeight / 2) / GRID_SIZE) * GRID_SIZE;
									break;
								case 'west':
									testX = Math.round((closestRoom.startX - distance * GRID_SIZE - newRoomWidth) / GRID_SIZE) * GRID_SIZE;
									testY = Math.round((roomCenterY - newRoomHeight / 2) / GRID_SIZE) * GRID_SIZE;
									break;
								case 'south':
									testX = Math.round((roomCenterX - newRoomWidth / 2) / GRID_SIZE) * GRID_SIZE;
									testY = Math.round((closestRoom.endY + distance * GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
									break;
								case 'north':
									testX = Math.round((roomCenterX - newRoomWidth / 2) / GRID_SIZE) * GRID_SIZE;
									testY = Math.round((closestRoom.startY - distance * GRID_SIZE - newRoomHeight) / GRID_SIZE) * GRID_SIZE;
									break;
								default:
									continue;
								}

								const testRoom = {
									startX: testX,
									endX: testX + newRoomWidth,
									startY: testY,
									endY: testY + newRoomHeight,
								};

								if (!checkRoomOverlap(testRoom, existingRooms)) {
									finalX = testX;
									finalY = testY;
									finalRoom = testRoom;
									foundPosition = true;
									break;
								}
							}
							if (foundPosition) break;
						}
					}
				}
			} else {
				// Fallback to basic grid snapping if no closest room found
				finalX = Math.round((worldX - newRoomWidth / 2) / GRID_SIZE) * GRID_SIZE;
				finalY = Math.round((worldY - newRoomHeight / 2) / GRID_SIZE) * GRID_SIZE;
			}
		} else {
			// No existing rooms, just center on click position with grid snap
			finalX = Math.round((worldX - newRoomWidth / 2) / GRID_SIZE) * GRID_SIZE;
			finalY = Math.round((worldY - newRoomHeight / 2) / GRID_SIZE) * GRID_SIZE;
		}

		setEditingRoom({
			id: `room_${Date.now()}`,
			layout_id: 'destiny',
			type: 'corridor',
			name: 'New Room',
			description: '',
			startX: finalX,
			endX: finalX + newRoomWidth,
			startY: finalY,
			endY: finalY + newRoomHeight,
			floor: selectedFloor,
			width: newRoomWidth,
			height: newRoomHeight,
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

	const handleCreateFurnitureAtPosition = (worldX: number, worldY: number) => {
		if (!selectedRoom) {
			toast.error('Please select a room first');
			return;
		}

		// Convert world coordinates to room-relative coordinates
		const roomCoords = worldToRoomCoordinates(worldX, worldY, selectedRoom);

		// Snap to furniture grid (8-point)
		const snappedX = Math.round(roomCoords.x / 8) * 8;
		const snappedY = Math.round(roomCoords.y / 8) * 8;

		setEditingFurniture({
			id: `furniture_${Date.now()}`,
			room_id: selectedRoom.id,
			furniture_type: 'console',
			name: 'New Furniture',
			description: '',
			x: snappedX,
			y: snappedY,
			z: 1, // Default z-index
			width: 32,
			height: 32,
			rotation: 0,
			interactive: true,
			blocks_movement: false,
			active: true,
			discovered: false,
			power_required: 0,
			created_at: Date.now(),
			updated_at: Date.now(),
		});
		setShowFurnitureModal(true);
	};

	const handleCreateDoorAtPosition = (worldX: number, worldY: number) => {
		if (!selectedRoom) {
			toast.error('Please select a room first');
			return;
		}

		// Snap to door grid (16-point)
		const snappedX = Math.round(worldX / 16) * 16;
		const snappedY = Math.round(worldY / 16) * 16;

		setEditingDoor({
			id: `door_${Date.now()}`,
			from_room_id: selectedRoom.id,
			to_room_id: '',
			x: snappedX,
			y: snappedY,
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

	const handleRemoveFurniture = async () => {
		if (!selectedFurniture) return;

		if (!confirm(`Are you sure you want to remove ${selectedFurniture.name}?`)) return;

		try {
			await adminService.deleteFurniture(selectedFurniture.id);
			toast.success('Furniture removed successfully');
			setSelectedFurniture(null);
			loadData();
		} catch (err: any) {
			toast.error(`Failed to remove furniture: ${err.message}`);
		}
	};

	const handleRemoveDoor = async () => {
		if (!selectedDoor) return;

		if (!confirm('Are you sure you want to remove this door?')) return;

		try {
			await adminService.deleteDoor(selectedDoor.id);
			toast.success('Door removed successfully');
			setSelectedDoor(null);
			loadData();
		} catch (err: any) {
			toast.error(`Failed to remove door: ${err.message}`);
		}
	};

	const handleRemoveRoom = async () => {
		if (!selectedRoom) return;

		if (!confirm('Are you sure you want to remove this room? This will also delete all connected doors.')) return;

		try {
			await adminService.deleteRoom(selectedRoom.id);
			toast.success('Room deleted successfully');
			setSelectedRoom(null);
			loadData();
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete room');
		}
	};

	// Room snapping and auto-door creation utilities
	const SNAP_THRESHOLD = 16; // Distance threshold for snapping (in world units)

	/**
	 * Find the closest room to a given world position
	 */
	const findClosestRoom = (worldX: number, worldY: number, otherRooms: RoomTemplate[]) => {
		if (otherRooms.length === 0) return null;

		let closestRoom = otherRooms[0];
		let closestDistance = Infinity;

		for (const room of otherRooms) {
			// Calculate distance to room's center
			const roomCenterX = (room.startX + room.endX) / 2;
			const roomCenterY = (room.startY + room.endY) / 2;
			const distance = Math.sqrt(
				Math.pow(worldX - roomCenterX, 2) + Math.pow(worldY - roomCenterY, 2),
			);

			if (distance < closestDistance) {
				closestDistance = distance;
				closestRoom = room;
			}
		}

		return closestRoom;
	};

	/**
	 * Check if a room would overlap with any existing rooms
	 */
	const checkRoomOverlap = (newRoom: { startX: number; endX: number; startY: number; endY: number }, existingRooms: RoomTemplate[], excludeId?: string) => {
		for (const room of existingRooms) {
			if (excludeId && room.id === excludeId) continue;

			// Check if rooms overlap
			if (!(newRoom.endX <= room.startX || newRoom.startX >= room.endX ||
				  newRoom.endY <= room.startY || newRoom.startY >= room.endY)) {
				return true; // Overlap detected
			}
		}
		return false; // No overlap
	};

	/**
	 * Find the best position to place a new room adjacent to an existing room
	 */
	const findBestAdjacentPosition = (clickX: number, clickY: number, targetRoom: RoomTemplate, newRoomWidth: number = 128, newRoomHeight: number = 128) => {
		// Define potential positions around the target room
		const spacing = 8; // Small gap between rooms
		const positions = [
			// North (above)
			{
				x: (targetRoom.startX + targetRoom.endX) / 2 - newRoomWidth / 2,
				y: targetRoom.startY - spacing - newRoomHeight,
				side: 'north' as const,
			},
			// South (below)
			{
				x: (targetRoom.startX + targetRoom.endX) / 2 - newRoomWidth / 2,
				y: targetRoom.endY + spacing,
				side: 'south' as const,
			},
			// East (right)
			{
				x: targetRoom.endX + spacing,
				y: (targetRoom.startY + targetRoom.endY) / 2 - newRoomHeight / 2,
				side: 'east' as const,
			},
			// West (left)
			{
				x: targetRoom.startX - spacing - newRoomWidth,
				y: (targetRoom.startY + targetRoom.endY) / 2 - newRoomHeight / 2,
				side: 'west' as const,
			},
		];

		// Sort positions by distance to click point
		const sortedPositions = positions.map(position => {
			const centerX = position.x + newRoomWidth / 2;
			const centerY = position.y + newRoomHeight / 2;
			const distance = Math.sqrt(
				Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2),
			);
			return { ...position, distance };
		}).sort((a, b) => a.distance - b.distance);

		// Find the first position that doesn't overlap with existing rooms
		for (const position of sortedPositions) {
			const testRoom = {
				startX: position.x,
				endX: position.x + newRoomWidth,
				startY: position.y,
				endY: position.y + newRoomHeight,
			};

			if (!checkRoomOverlap(testRoom, floorRooms)) {
				return position;
			}
		}

		// If all positions overlap, return the closest one anyway
		return sortedPositions[0];
	};

	const findSnapPosition = (room: RoomTemplate, otherRooms: RoomTemplate[]) => {
		const snappedRoom = { ...room };
		let hasSnapped = false;
		let bestSnapDistance = SNAP_THRESHOLD;
		let bestSnapDelta = { x: 0, y: 0 };

		for (const otherRoom of otherRooms) {
			if (otherRoom.id === room.id) continue; // Skip self

			// Check for horizontal snapping (rooms side by side)
			// Left edge of moving room to right edge of other room
			const leftToRightDistance = Math.abs(room.startX - otherRoom.endX);
			if (leftToRightDistance <= SNAP_THRESHOLD &&
				!(room.endY <= otherRoom.startY || room.startY >= otherRoom.endY)) {
				if (leftToRightDistance < bestSnapDistance) {
					bestSnapDistance = leftToRightDistance;
					bestSnapDelta = { x: otherRoom.endX - room.startX, y: 0 };
					hasSnapped = true;
				}
			}

			// Right edge of moving room to left edge of other room
			const rightToLeftDistance = Math.abs(room.endX - otherRoom.startX);
			if (rightToLeftDistance <= SNAP_THRESHOLD &&
				!(room.endY <= otherRoom.startY || room.startY >= otherRoom.endY)) {
				if (rightToLeftDistance < bestSnapDistance) {
					bestSnapDistance = rightToLeftDistance;
					bestSnapDelta = { x: otherRoom.startX - room.endX, y: 0 };
					hasSnapped = true;
				}
			}

			// Check for vertical snapping (rooms above/below)
			// Top edge of moving room to bottom edge of other room
			const topToBottomDistance = Math.abs(room.startY - otherRoom.endY);
			if (topToBottomDistance <= SNAP_THRESHOLD &&
				!(room.endX <= otherRoom.startX || room.startX >= otherRoom.endX)) {
				if (topToBottomDistance < bestSnapDistance) {
					bestSnapDistance = topToBottomDistance;
					bestSnapDelta = { x: 0, y: otherRoom.endY - room.startY };
					hasSnapped = true;
				}
			}

			// Bottom edge of moving room to top edge of other room
			const bottomToTopDistance = Math.abs(room.endY - otherRoom.startY);
			if (bottomToTopDistance <= SNAP_THRESHOLD &&
				!(room.endX <= otherRoom.startX || room.startX >= otherRoom.endX)) {
				if (bottomToTopDistance < bestSnapDistance) {
					bestSnapDistance = bottomToTopDistance;
					bestSnapDelta = { x: 0, y: otherRoom.startY - room.endY };
					hasSnapped = true;
				}
			}
		}

		// Apply the best snap delta if we found one
		if (hasSnapped) {
			snappedRoom.startX += bestSnapDelta.x;
			snappedRoom.endX += bestSnapDelta.x;
			snappedRoom.startY += bestSnapDelta.y;
			snappedRoom.endY += bestSnapDelta.y;
		}

		return { snappedRoom, hasSnapped };
	};

	const findAdjacentRooms = (room: RoomTemplate, otherRooms: RoomTemplate[]) => {
		const adjacentRooms: Array<{ room: RoomTemplate; side: 'north' | 'south' | 'east' | 'west' }> = [];

		for (const otherRoom of otherRooms) {
			if (otherRoom.id === room.id) continue; // Skip self

			// Check if rooms are adjacent (touching edges)
			// East side: right edge of room touches left edge of other room
			if (room.endX === otherRoom.startX &&
				!(room.endY <= otherRoom.startY || room.startY >= otherRoom.endY)) {
				adjacentRooms.push({ room: otherRoom, side: 'east' });
			}
			// West side: left edge of room touches right edge of other room
			else if (room.startX === otherRoom.endX &&
				!(room.endY <= otherRoom.startY || room.startY >= otherRoom.endY)) {
				adjacentRooms.push({ room: otherRoom, side: 'west' });
			}
			// South side: bottom edge of room touches top edge of other room
			else if (room.endY === otherRoom.startY &&
				!(room.endX <= otherRoom.startX || room.startX >= otherRoom.endX)) {
				adjacentRooms.push({ room: otherRoom, side: 'south' });
			}
			// North side: top edge of room touches bottom edge of other room
			else if (room.startY === otherRoom.endY &&
				!(room.endX <= otherRoom.startX || room.startX >= otherRoom.endX)) {
				adjacentRooms.push({ room: otherRoom, side: 'north' });
			}
		}

		return adjacentRooms;
	};

	const createAutomaticDoor = async (fromRoom: RoomTemplate, toRoom: RoomTemplate, side: 'north' | 'south' | 'east' | 'west') => {
		// Calculate door position based on the side where rooms are adjacent
		let doorX: number, doorY: number, rotation: number;

		switch (side) {
		case 'east': // Door on the right edge of fromRoom
			doorX = fromRoom.endX;
			doorY = Math.max(fromRoom.startY, toRoom.startY) + Math.min(fromRoom.endY - fromRoom.startY, toRoom.endY - toRoom.startY) / 2;
			rotation = 90; // Vertical door
			break;
		case 'west': // Door on the left edge of fromRoom
			doorX = fromRoom.startX;
			doorY = Math.max(fromRoom.startY, toRoom.startY) + Math.min(fromRoom.endY - fromRoom.startY, toRoom.endY - toRoom.startY) / 2;
			rotation = 90; // Vertical door
			break;
		case 'south': // Door on the bottom edge of fromRoom
			doorX = Math.max(fromRoom.startX, toRoom.startX) + Math.min(fromRoom.endX - fromRoom.startX, toRoom.endX - toRoom.startX) / 2;
			doorY = fromRoom.endY;
			rotation = 0; // Horizontal door
			break;
		case 'north': // Door on the top edge of fromRoom
			doorX = Math.max(fromRoom.startX, toRoom.startX) + Math.min(fromRoom.endX - fromRoom.startX, toRoom.endX - toRoom.startX) / 2;
			doorY = fromRoom.startY;
			rotation = 0; // Horizontal door
			break;
		}

		// Check if a door already exists between these rooms at this position
		const existingDoor = floorDoors.find(door =>
			((door.from_room_id === fromRoom.id && door.to_room_id === toRoom.id) ||
			 (door.from_room_id === toRoom.id && door.to_room_id === fromRoom.id)) &&
			Math.abs(door.x - doorX) < 32 && Math.abs(door.y - doorY) < 32,
		);

		if (existingDoor) {
			return; // Door already exists, don't create another
		}

		// Create the door
		const newDoor: Partial<DoorTemplate> = {
			id: `door_${Date.now()}_${fromRoom.id}_${toRoom.id}`,
			name: `Door: ${fromRoom.name} ↔ ${toRoom.name}`,
			from_room_id: fromRoom.id,
			to_room_id: toRoom.id,
			x: doorX,
			y: doorY,
			width: 32,
			height: 8,
			rotation,
			state: 'closed',
			is_automatic: false,
			open_direction: 'inward',
			style: 'standard',
			power_required: 0,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		try {
			await adminService.createDoor(newDoor);
			toast.success(`Auto-created door between ${fromRoom.name} and ${toRoom.name}`);
			// Reload doors to show the new door
			const doorsData = await adminService.getAllDoors();
			setDoors(doorsData);
		} catch (err: any) {
			console.warn('Failed to create automatic door:', err);
			// Don't show error toast for auto-door creation failures
		}
	};

	const handleSaveRoom = async () => {
		try {
			// Prepare room data - remove calculated fields and clean up undefined values
			const { width, height, ...rawRoomData } = editingRoom;

			// Clean up the data to avoid sending undefined values
			const roomData = {
				id: rawRoomData.id || `room_${Date.now()}`,
				layout_id: rawRoomData.layout_id || 'destiny',
				type: rawRoomData.type || 'corridor',
				name: rawRoomData.name || 'New Room',
				description: rawRoomData.description || '',
				startX: rawRoomData.startX || 0,
				endX: rawRoomData.endX || 100,
				startY: rawRoomData.startY || 0,
				endY: rawRoomData.endY || 100,
				floor: rawRoomData.floor ?? selectedFloor,
				found: rawRoomData.found || false,
				locked: rawRoomData.locked || false,
				explored: rawRoomData.explored || false,
				base_exploration_time: rawRoomData.base_exploration_time || 2,
				status: rawRoomData.status || 'ok',
				image: rawRoomData.image || null,
				exploration_data: rawRoomData.exploration_data || null,
				connection_north: rawRoomData.connection_north || null,
				connection_south: rawRoomData.connection_south || null,
				connection_east: rawRoomData.connection_east || null,
				connection_west: rawRoomData.connection_west || null,
				created_at: rawRoomData.created_at || Date.now(),
				updated_at: Date.now(), // Always update the timestamp
			};

			console.log('Sending room data:', roomData);

			if (selectedRoom?.id === editingRoom.id) {
				await adminService.updateRoom(editingRoom.id!, roomData);
				toast.success('Room updated successfully');
			} else {
				await adminService.createRoom(roomData);
				toast.success('Room created successfully');
			}

			// Only close modal and reload data on success
			setShowRoomModal(false);
			loadData();
		} catch (err: any) {
			console.error('Room save error:', err);

			// The admin service already extracts the error message
			const errorMessage = err?.message || 'Failed to save room';

			toast.error(errorMessage);
			// Don't close modal on error - let user see the error and try again
		}
	};

	const handleSaveDoor = async () => {
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
	};

	const handleSaveFurniture = async () => {
		try {
			if (selectedFurniture?.id === editingFurniture.id) {
				await adminService.updateFurniture(editingFurniture.id!, editingFurniture);
				toast.success('Furniture updated successfully');
			} else {
				await adminService.createFurniture(editingFurniture);
				toast.success('Furniture created successfully');
			}
			setShowFurnitureModal(false);
			loadData();
		} catch (err: any) {
			toast.error(err.message || 'Failed to save furniture');
		}
	};

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
				<div className="flex-grow-1 position-relative">
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
							cursor: dragState.isDragging ?
								(dragState.dragType === 'camera' ? 'grabbing' : 'move') :
								(selectedRoom || selectedDoor || selectedFurniture) ? 'move' :
									isMouseDown ? 'grabbing' : 'grab',
							maxWidth: '100%',
							height: 'auto',
						}}
						onWheel={handleCanvasWheel}
						onMouseDown={handleCanvasMouseDown}
						onMouseMove={handleCanvasMouseMove}
						onMouseUp={handleCanvasMouseUp}
						onContextMenu={handleContextMenu}
					/>
					<small className="text-muted d-block mt-1">
						<strong>Controls:</strong> Mouse wheel to zoom, click and drag to pan<br/>
						<strong>Moving Items:</strong> Select an item, then drag to move it (snaps to grid)<br/>
						<strong>Context Menu:</strong> Right-click for options, Cmd+I for inspector<br/>
						<strong>Keyboard:</strong> WASD/Arrow keys to move, +/- to zoom, 0 to reset view
					</small>

					{/* Context Menu */}
					{contextMenu.visible && (
						<div
							className="position-fixed bg-dark border rounded shadow-lg"
							style={{
								left: contextMenu.x,
								top: contextMenu.y,
								zIndex: 1000,
								minWidth: '180px',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="py-1">
								{contextMenu.type === 'empty' && (
									<>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('add-room')}
										>
											<FaPlus className="me-2" />Add Room
										</button>
									</>
								)}

								{contextMenu.type === 'room' && (
									<>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('add-furniture')}
										>
											<FaPlus className="me-2" />Add Furniture
										</button>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('add-door')}
										>
											<FaPlus className="me-2" />Add Door
										</button>
										<hr className="dropdown-divider bg-secondary" />
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('modify-room')}
										>
											<FaEdit className="me-2" />Modify Properties
										</button>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('inspector')}
										>
											<FaEye className="me-2" />Inspector (Cmd+I)
										</button>
										<hr className="dropdown-divider bg-secondary" />
										<button
											className="dropdown-item text-danger bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('remove-room')}
										>
											<FaTrash className="me-2" />Delete Room
										</button>
									</>
								)}

								{contextMenu.type === 'door' && (
									<>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('modify-door')}
										>
											<FaEdit className="me-2" />Modify Properties
										</button>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('inspector')}
										>
											<FaEye className="me-2" />Inspector (Cmd+I)
										</button>
										<hr className="dropdown-divider bg-secondary" />
										<button
											className="dropdown-item text-danger bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('remove-door')}
										>
											<FaTrash className="me-2" />Remove Door
										</button>
									</>
								)}

								{contextMenu.type === 'furniture' && (
									<>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('modify-furniture')}
										>
											<FaEdit className="me-2" />Modify Properties
										</button>
										<button
											className="dropdown-item text-light bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('inspector')}
										>
											<FaEye className="me-2" />Inspector (Cmd+I)
										</button>
										<hr className="dropdown-divider bg-secondary" />
										<button
											className="dropdown-item text-danger bg-transparent border-0 w-100 text-start px-3 py-2"
											onClick={() => handleContextMenuAction('remove-furniture')}
										>
											<FaTrash className="me-2" />Remove Furniture
										</button>
									</>
								)}
							</div>
						</div>
					)}
				</div>
			</div>


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
										onChange={(e) => setEditingDoor({...editingDoor, state: e.target.value as 'opened' | 'closed' | 'locked'})}
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
										onChange={(e) => setEditingDoor({...editingDoor, open_direction: e.target.value as 'inward' | 'outward' | 'sliding'})}
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
					<Button variant="primary" onClick={handleSaveDoor}>
						Save Door
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Furniture Modal */}
			<Modal show={showFurnitureModal} onHide={() => setShowFurnitureModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Furniture Properties</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Furniture ID</Form.Label>
									<Form.Control
										type="text"
										value={editingFurniture.id || ''}
										onChange={(e) => setEditingFurniture({...editingFurniture, id: e.target.value})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Name</Form.Label>
									<Form.Control
										type="text"
										value={editingFurniture.name || ''}
										onChange={(e) => setEditingFurniture({...editingFurniture, name: e.target.value})}
									/>
								</Form.Group>
							</div>
						</div>

						<Form.Group className="mb-3">
							<Form.Label>Description</Form.Label>
							<Form.Control
								as="textarea"
								rows={2}
								value={editingFurniture.description || ''}
								onChange={(e) => setEditingFurniture({...editingFurniture, description: e.target.value})}
							/>
						</Form.Group>

						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Type</Form.Label>
									<Form.Select
										value={editingFurniture.furniture_type || 'console'}
										onChange={(e) => setEditingFurniture({...editingFurniture, furniture_type: e.target.value})}
									>
										<option value="console">Console</option>
										<option value="stargate">Stargate</option>
										<option value="stargate_dialer">Stargate Dialer</option>
										<option value="bed">Bed</option>
										<option value="table">Table</option>
										<option value="chair">Chair</option>
										<option value="storage">Storage</option>
										<option value="workstation">Workstation</option>
										<option value="custom">Custom</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Room</Form.Label>
									<Form.Select
										value={editingFurniture.room_id || ''}
										onChange={(e) => setEditingFurniture({...editingFurniture, room_id: e.target.value})}
									>
										{floorRooms.map(room => (
											<option key={room.id} value={room.id}>{room.name}</option>
										))}
									</Form.Select>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>X Position</Form.Label>
									<Form.Control
										type="number"
										step="8"
										value={editingFurniture.x || 0}
										onChange={(e) => setEditingFurniture({...editingFurniture, x: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>Y Position</Form.Label>
									<Form.Control
										type="number"
										step="8"
										value={editingFurniture.y || 0}
										onChange={(e) => setEditingFurniture({...editingFurniture, y: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>Width</Form.Label>
									<Form.Control
										type="number"
										step="8"
										value={editingFurniture.width || 32}
										onChange={(e) => setEditingFurniture({...editingFurniture, width: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>Height</Form.Label>
									<Form.Control
										type="number"
										step="8"
										value={editingFurniture.height || 32}
										onChange={(e) => setEditingFurniture({...editingFurniture, height: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Rotation</Form.Label>
									<Form.Select
										value={editingFurniture.rotation || 0}
										onChange={(e) => setEditingFurniture({...editingFurniture, rotation: parseInt(e.target.value)})}
									>
										<option value={0}>0° (North)</option>
										<option value={90}>90° (East)</option>
										<option value={180}>180° (South)</option>
										<option value={270}>270° (West)</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Power Required</Form.Label>
									<Form.Control
										type="number"
										value={editingFurniture.power_required || 0}
										onChange={(e) => setEditingFurniture({...editingFurniture, power_required: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Color</Form.Label>
									<Form.Control
										type="color"
										value={editingFurniture.color || '#ffffff'}
										onChange={(e) => setEditingFurniture({...editingFurniture, color: e.target.value})}
									/>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Check
										type="checkbox"
										label="Interactive"
										checked={editingFurniture.interactive || false}
										onChange={(e) => setEditingFurniture({...editingFurniture, interactive: e.target.checked})}
									/>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Check
									type="checkbox"
									label="Active"
									checked={editingFurniture.active || false}
									onChange={(e) => setEditingFurniture({...editingFurniture, active: e.target.checked})}
								/>
							</div>
							<div className="col-md-4">
								<Form.Check
									type="checkbox"
									label="Discovered"
									checked={editingFurniture.discovered || false}
									onChange={(e) => setEditingFurniture({...editingFurniture, discovered: e.target.checked})}
								/>
							</div>
						</div>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowFurnitureModal(false)}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSaveFurniture}>
						Save Furniture
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Room Modal */}
			<Modal show={showRoomModal} onHide={() => setShowRoomModal(false)}>
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
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Layout ID</Form.Label>
									<Form.Select
										value={editingRoom.layout_id || 'destiny'}
										onChange={(e) => setEditingRoom({...editingRoom, layout_id: e.target.value})}
									>
										<option value="destiny">Destiny</option>
										<option value="atlantis">Atlantis</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Type</Form.Label>
									<Form.Select
										value={editingRoom.type || 'corridor'}
										onChange={(e) => setEditingRoom({...editingRoom, type: e.target.value})}
									>
										<option value="corridor">Corridor</option>
										<option value="gate_room">Gate Room</option>
										<option value="control_room">Control Room</option>
										<option value="quarters">Quarters</option>
										<option value="bridge">Bridge</option>
										<option value="hydroponics">Hydroponics</option>
										<option value="medical">Medical</option>
										<option value="storage">Storage</option>
										<option value="elevator">Elevator</option>
										<option value="room">Generic Room</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-4">
								<Form.Group className="mb-3">
									<Form.Label>Floor</Form.Label>
									<Form.Control
										type="number"
										value={editingRoom.floor || selectedFloor}
										onChange={(e) => setEditingRoom({...editingRoom, floor: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
						</div>

						<h6>Coordinates (SpriteKit - Center Origin)</h6>
						<div className="row">
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>Start X</Form.Label>
									<Form.Control
										type="number"
										step="32"
										value={editingRoom.startX || 0}
										onChange={(e) => {
											const startX = parseInt(e.target.value);
											const width = (editingRoom.endX || 0) - startX;
											setEditingRoom({...editingRoom, startX, width});
										}}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>End X</Form.Label>
									<Form.Control
										type="number"
										step="32"
										value={editingRoom.endX || 0}
										onChange={(e) => {
											const endX = parseInt(e.target.value);
											const width = endX - (editingRoom.startX || 0);
											setEditingRoom({...editingRoom, endX, width});
										}}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>Start Y</Form.Label>
									<Form.Control
										type="number"
										step="32"
										value={editingRoom.startY || 0}
										onChange={(e) => {
											const startY = parseInt(e.target.value);
											const height = (editingRoom.endY || 0) - startY;
											setEditingRoom({...editingRoom, startY, height});
										}}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-3">
									<Form.Label>End Y</Form.Label>
									<Form.Control
										type="number"
										step="32"
										value={editingRoom.endY || 0}
										onChange={(e) => {
											const endY = parseInt(e.target.value);
											const height = endY - (editingRoom.startY || 0);
											setEditingRoom({...editingRoom, endY, height});
										}}
									/>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Width (calculated)</Form.Label>
									<Form.Control
										type="number"
										value={(editingRoom.endX || 0) - (editingRoom.startX || 0)}
										disabled
									/>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Height (calculated)</Form.Label>
									<Form.Control
										type="number"
										value={(editingRoom.endY || 0) - (editingRoom.startY || 0)}
										disabled
									/>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Status</Form.Label>
									<Form.Select
										value={editingRoom.status || 'ok'}
										onChange={(e) => setEditingRoom({...editingRoom, status: e.target.value})}
									>
										<option value="ok">OK</option>
										<option value="damaged">Damaged</option>
										<option value="destroyed">Destroyed</option>
										<option value="unknown">Unknown</option>
									</Form.Select>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Base Exploration Time</Form.Label>
									<Form.Control
										type="number"
										min="0"
										value={editingRoom.base_exploration_time || 2}
										onChange={(e) => setEditingRoom({...editingRoom, base_exploration_time: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
						</div>

						<div className="row">
							<div className="col-md-4">
								<Form.Check
									type="checkbox"
									label="Found"
									checked={editingRoom.found || false}
									onChange={(e) => setEditingRoom({...editingRoom, found: e.target.checked})}
								/>
							</div>
							<div className="col-md-4">
								<Form.Check
									type="checkbox"
									label="Locked"
									checked={editingRoom.locked || false}
									onChange={(e) => setEditingRoom({...editingRoom, locked: e.target.checked})}
								/>
							</div>
							<div className="col-md-4">
								<Form.Check
									type="checkbox"
									label="Explored"
									checked={editingRoom.explored || false}
									onChange={(e) => setEditingRoom({...editingRoom, explored: e.target.checked})}
								/>
							</div>
						</div>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowRoomModal(false)}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSaveRoom}>
						Save Room
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Inspector Modal */}
			<Modal show={showInspectorModal} onHide={() => setShowInspectorModal(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Inspector - {selectedRoom ? 'Room' : selectedDoor ? 'Door' : selectedFurniture ? 'Furniture' : 'Nothing Selected'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedRoom && (
						<div>
							<h5>Room: {selectedRoom.name || selectedRoom.id}</h5>
							<Table striped bordered hover size="sm">
								<tbody>
									<tr><td><strong>ID</strong></td><td>{selectedRoom.id}</td></tr>
									<tr><td><strong>Name</strong></td><td>{selectedRoom.name}</td></tr>
									<tr><td><strong>Description</strong></td><td>{selectedRoom.description}</td></tr>
									<tr><td><strong>Type</strong></td><td>{selectedRoom.type}</td></tr>
									<tr><td><strong>Layout</strong></td><td>{selectedRoom.layout_id}</td></tr>
									<tr><td><strong>Floor</strong></td><td>{selectedRoom.floor}</td></tr>
									<tr><td><strong>Status</strong></td><td>{selectedRoom.status}</td></tr>
									<tr><td><strong>Coordinates</strong></td><td>({selectedRoom.startX}, {selectedRoom.startY}) to ({selectedRoom.endX}, {selectedRoom.endY})</td></tr>
									<tr><td><strong>Size</strong></td><td>{selectedRoom.width} x {selectedRoom.height}</td></tr>
									<tr><td><strong>Found</strong></td><td>{selectedRoom.found ? 'Yes' : 'No'}</td></tr>
									<tr><td><strong>Locked</strong></td><td>{selectedRoom.locked ? 'Yes' : 'No'}</td></tr>
									<tr><td><strong>Explored</strong></td><td>{selectedRoom.explored ? 'Yes' : 'No'}</td></tr>
									<tr><td><strong>Exploration Time</strong></td><td>{selectedRoom.base_exploration_time} minutes</td></tr>
								</tbody>
							</Table>
							<div className="d-flex gap-2">
								<Button variant="primary" onClick={() => {
									setEditingRoom({...selectedRoom});
									setShowRoomModal(true);
									setShowInspectorModal(false);
								}}>
									Edit Properties
								</Button>
								<Button variant="danger" onClick={async () => {
									if (confirm(`Are you sure you want to delete room "${selectedRoom.name || selectedRoom.id}"?`)) {
										try {
											await adminService.deleteRoom(selectedRoom.id!);
											toast.success('Room deleted successfully');
											setSelectedRoom(null);
											setShowInspectorModal(false);
											loadData();
										} catch (err: any) {
											toast.error(err.message || 'Failed to delete room');
										}
									}
								}}>
									Delete Room
								</Button>
							</div>
						</div>
					)}

					{selectedDoor && (
						<div>
							<h5>Door: {selectedDoor.name || selectedDoor.id}</h5>
							<Table striped bordered hover size="sm">
								<tbody>
									<tr>
										<td><strong>ID</strong></td>
										<td>{selectedDoor.id}</td>
									</tr>
									<tr>
										<td><strong>Name</strong></td>
										<td>{selectedDoor.name}</td>
									</tr>
									<tr>
										<td><strong>Style</strong></td>
										<td>{selectedDoor.style}</td>
									</tr>
									<tr>
										<td><strong>Position</strong></td>
										<td>({selectedDoor.x}, {selectedDoor.y})</td>
									</tr>
									<tr>
										<td><strong>Size</strong></td>
										<td>{selectedDoor.width} x {selectedDoor.height}</td>
									</tr>
									<tr>
										<td><strong>Rotation</strong></td>
										<td>{selectedDoor.rotation}°</td>
									</tr>
									<tr>
										<td><strong>State</strong></td>
										<td>{selectedDoor.state}</td>
									</tr>
									<tr>
										<td><strong>Requires Power</strong></td>
										<td>{(selectedDoor.power_required && selectedDoor.power_required > 0) ? 'Yes' : 'No'}</td>
									</tr>
									<tr>
										<td><strong>Locked</strong></td>
										<td>{selectedDoor.state === 'locked' ? 'Yes' : 'No'}</td>
									</tr>
								</tbody>
							</Table>
							<div className="d-flex gap-2">
								<Button variant="primary" onClick={() => {
									setEditingDoor({...selectedDoor});
									setShowDoorModal(true);
									setShowInspectorModal(false);
								}}>
									Edit Properties
								</Button>
								<Button variant="danger" onClick={async () => {
									if (confirm(`Are you sure you want to delete door "${selectedDoor.name || selectedDoor.id}"?`)) {
										try {
											await adminService.deleteDoor(selectedDoor.id!);
											toast.success('Door deleted successfully');
											setSelectedDoor(null);
											setShowInspectorModal(false);
											loadData();
										} catch (err: any) {
											toast.error(err.message || 'Failed to delete door');
										}
									}
								}}>
									Delete Door
								</Button>
							</div>
						</div>
					)}

					{selectedFurniture && (
						<div>
							<h5>Furniture: {selectedFurniture.name || selectedFurniture.id}</h5>
							<Table striped bordered hover size="sm">
								<tbody>
									<tr>
										<td><strong>ID</strong></td>
										<td>{selectedFurniture.id}</td>
									</tr>
									<tr>
										<td><strong>Name</strong></td>
										<td>{selectedFurniture.name}</td>
									</tr>
									<tr>
										<td><strong>Description</strong></td>
										<td>{selectedFurniture.description}</td>
									</tr>
									<tr>
										<td><strong>Type</strong></td>
										<td>{selectedFurniture.furniture_type}</td>
									</tr>
									<tr>
										<td><strong>Room</strong></td>
										<td>{selectedFurniture.room_id}</td>
									</tr>
									<tr>
										<td><strong>Position (Room)</strong></td>
										<td>({selectedFurniture.x}, {selectedFurniture.y})</td>
									</tr>
									<tr>
										<td><strong>Size</strong></td>
										<td>{selectedFurniture.width} x {selectedFurniture.height}</td>
									</tr>
									<tr>
										<td><strong>Rotation</strong></td>
										<td>{selectedFurniture.rotation}°</td>
									</tr>
									<tr>
										<td><strong>Z-Index</strong></td>
										<td>{selectedFurniture.z}</td>
									</tr>
									<tr>
										<td><strong>Interactable</strong></td>
										<td>{selectedFurniture.interactive ? 'Yes' : 'No'}</td>
									</tr>
									<tr>
										<td><strong>Blocks Movement</strong></td>
										<td>{selectedFurniture.blocks_movement ? 'Yes' : 'No'}</td>
									</tr>
									<tr>
										<td><strong>Requires Power</strong></td>
										<td>{selectedFurniture.power_required > 0 ? 'Yes' : 'No'}</td>
									</tr>
								</tbody>
							</Table>
							<div className="d-flex gap-2">
								<Button variant="primary" onClick={() => {
									setEditingFurniture({...selectedFurniture});
									setShowFurnitureModal(true);
									setShowInspectorModal(false);
								}}>
									Edit Properties
								</Button>
								<Button variant="danger" onClick={async () => {
									if (confirm(`Are you sure you want to delete furniture "${selectedFurniture.name || selectedFurniture.id}"?`)) {
										try {
											await adminService.deleteFurniture(selectedFurniture.id!);
											toast.success('Furniture deleted successfully');
											setSelectedFurniture(null);
											setShowInspectorModal(false);
											loadData();
										} catch (err: any) {
											toast.error(err.message || 'Failed to delete furniture');
										}
									}
								}}>
									Delete Furniture
								</Button>
							</div>
						</div>
					)}

					{!selectedRoom && !selectedDoor && !selectedFurniture && (
						<Alert variant="info">
							No item selected. Click on a room, door, or furniture item to inspect it, or press Cmd+I to open the inspector.
						</Alert>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowInspectorModal(false)}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};

