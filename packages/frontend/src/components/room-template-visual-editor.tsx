import type {
	RoomTemplate,
	RoomFurniture,
	RoomTechnology,
	FurnitureTemplate,
	TechnologyTemplate,
} from '@stargate/common';
import React, { useState, useEffect, useRef } from 'react';
import { Button, Alert, Dropdown } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { AdminService } from '../services/admin-service';

interface RoomTemplateVisualEditorProps {
	roomTemplate: RoomTemplate;
	onSave?: () => void;
	onRoomSizeChange?: (width: number, height: number) => void;
}

type DragState = {
	isDragging: boolean;
	dragType: 'furniture' | 'technology' | 'camera' | 'none';
	dragId: string | null;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
	originalPosition?: { x: number; y: number };
};

type ContextMenu = {
	visible: boolean;
	x: number;
	y: number;
	type: 'empty' | 'furniture' | 'technology';
	targetId?: string;
	roomX: number;
	roomY: number;
};

type Camera = {
	x: number; // Camera position in room coordinates
	y: number; // Camera position in room coordinates
	zoom: number; // Zoom level (1.0 = normal)
};

export const RoomTemplateVisualEditor: React.FC<RoomTemplateVisualEditorProps> = ({ roomTemplate, onSave, onRoomSizeChange }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [furniture, setFurniture] = useState<RoomFurniture[]>([]);
	const [technology, setTechnology] = useState<RoomTechnology[]>([]);
	const [furnitureTemplates, setFurnitureTemplates] = useState<FurnitureTemplate[]>([]);
	const [technologyTemplates, setTechnologyTemplates] = useState<TechnologyTemplate[]>([]);
	const [selectedFurniture, setSelectedFurniture] = useState<RoomFurniture | null>(null);
	const [selectedTechnology, setSelectedTechnology] = useState<RoomTechnology | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isMouseDown, setIsMouseDown] = useState(false);

	const [dragState, setDragState] = useState<DragState>({
		isDragging: false,
		dragType: 'none',
		dragId: null,
		startX: 0,
		startY: 0,
		currentX: 0,
		currentY: 0,
	});

	const [contextMenu, setContextMenu] = useState<ContextMenu>({
		visible: false,
		x: 0,
		y: 0,
		type: 'empty',
		roomX: 0,
		roomY: 0,
	});

	const [camera, setCamera] = useState<Camera>({
		x: roomTemplate.default_width / 2, // Center on room
		y: roomTemplate.default_height / 2,
		zoom: 20.0, // Start zoomed in to see room details (20 pixels per room unit)
	});

	const adminService = new AdminService();

	// Canvas settings - same as room-builder
	const CANVAS_WIDTH = 1200;
	const CANVAS_HEIGHT = 800;
	const GRID_SIZE = 1; // 1 room unit grid
	const MIN_ZOOM = 5.0;
	const MAX_ZOOM = 50.0;

	// Camera transformation functions - same pattern as room-builder
	const roomToScreen = (roomX: number, roomY: number) => {
		const screenX = (CANVAS_WIDTH / 2) + (roomX - camera.x) * camera.zoom;
		const screenY = (CANVAS_HEIGHT / 2) + (roomY - camera.y) * camera.zoom;
		return { x: screenX, y: screenY };
	};

	const screenToRoom = (screenX: number, screenY: number) => {
		const roomX = camera.x + (screenX - CANVAS_WIDTH / 2) / camera.zoom;
		const roomY = camera.y + (screenY - CANVAS_HEIGHT / 2) / camera.zoom;
		return { x: roomX, y: roomY };
	};

	useEffect(() => {
		loadData();
	}, [roomTemplate.id]);

	useEffect(() => {
		drawCanvas();
	}, [furniture, technology, selectedFurniture, selectedTechnology, camera, dragState]);

	const loadData = async () => {
		try {
			setLoading(true);
			const [furnitureData, technologyData, furnitureTemplatesData, technologyTemplatesData] = await Promise.all([
				adminService.getRoomTemplateFurniture(roomTemplate.id),
				adminService.getRoomTemplateTechnology(roomTemplate.id),
				adminService.getFurnitureTemplates(),
				adminService.getAllTechnologyTemplates(),
			]);

			setFurniture(furnitureData);
			setTechnology(technologyData);
			setFurnitureTemplates(furnitureTemplatesData);
			setTechnologyTemplates(technologyTemplatesData);
			setError(null);
		} catch (err) {
			console.error('Failed to load room template data:', err);
			setError(err instanceof Error ? err.message : 'Failed to load data');
		} finally {
			setLoading(false);
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

		// Draw room boundary
		drawRoomBoundary(ctx);

		// Draw furniture
		furniture.forEach(item => drawFurniture(ctx, item));

		// Draw technology
		technology.forEach(item => drawTechnology(ctx, item));

		// Draw selection highlights
		if (selectedFurniture) {
			drawSelectionHighlight(ctx, selectedFurniture);
		}
		if (selectedTechnology) {
			drawTechnologySelectionHighlight(ctx, selectedTechnology);
		}
	};

	const drawGrid = (ctx: CanvasRenderingContext2D) => {
		ctx.strokeStyle = '#2d3748';
		ctx.lineWidth = 1;

		// Get visible area in room coordinates
		const topLeft = screenToRoom(0, 0);
		const bottomRight = screenToRoom(CANVAS_WIDTH, CANVAS_HEIGHT);

		// Draw vertical grid lines
		const startX = Math.floor(topLeft.x / GRID_SIZE) * GRID_SIZE;
		const endX = Math.ceil(bottomRight.x / GRID_SIZE) * GRID_SIZE;

		for (let x = startX; x <= endX; x += GRID_SIZE) {
			const screenPos = roomToScreen(x, 0);
			if (screenPos.x >= 0 && screenPos.x <= CANVAS_WIDTH) {
				ctx.beginPath();
				ctx.moveTo(screenPos.x, 0);
				ctx.lineTo(screenPos.x, CANVAS_HEIGHT);
				ctx.stroke();
			}
		}

		// Draw horizontal grid lines
		const startY = Math.floor(topLeft.y / GRID_SIZE) * GRID_SIZE;
		const endY = Math.ceil(bottomRight.y / GRID_SIZE) * GRID_SIZE;

		for (let y = startY; y <= endY; y += GRID_SIZE) {
			const screenPos = roomToScreen(0, y);
			if (screenPos.y >= 0 && screenPos.y <= CANVAS_HEIGHT) {
				ctx.beginPath();
				ctx.moveTo(0, screenPos.y);
				ctx.lineTo(CANVAS_WIDTH, screenPos.y);
				ctx.stroke();
			}
		}
	};

	const drawRoomBoundary = (ctx: CanvasRenderingContext2D) => {
		// Draw room boundary
		ctx.strokeStyle = '#4299e1';
		ctx.lineWidth = 3;
		ctx.setLineDash([5, 5]);

		const topLeft = roomToScreen(0, 0);
		const bottomRight = roomToScreen(roomTemplate.default_width, roomTemplate.default_height);

		ctx.beginPath();
		ctx.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
		ctx.stroke();

		ctx.setLineDash([]);
	};

	const drawFurniture = (ctx: CanvasRenderingContext2D, item: RoomFurniture) => {
		const screenPos = roomToScreen(item.x, item.y);
		const screenWidth = item.width * camera.zoom;
		const screenHeight = item.height * camera.zoom;

		// Skip if off-screen
		if (screenPos.x < -screenWidth || screenPos.x > CANVAS_WIDTH + screenWidth ||
			screenPos.y < -screenHeight || screenPos.y > CANVAS_HEIGHT + screenHeight) {
			return;
		}

		// Draw furniture rectangle
		ctx.fillStyle = item.color || '#48bb78';
		ctx.fillRect(screenPos.x, screenPos.y, screenWidth, screenHeight);

		// Draw border
		ctx.strokeStyle = '#2d3748';
		ctx.lineWidth = 1;
		ctx.strokeRect(screenPos.x, screenPos.y, screenWidth, screenHeight);

		// Draw label
		ctx.fillStyle = '#ffffff';
		ctx.font = `${Math.max(10, 12 * camera.zoom / 20)}px Arial`;
		ctx.textAlign = 'center';
		ctx.fillText(item.name, screenPos.x + screenWidth / 2, screenPos.y + screenHeight / 2 + 4);
	};

	const drawTechnology = (ctx: CanvasRenderingContext2D, item: RoomTechnology) => {
		if (!item.position?.x || !item.position?.y) return;

		const screenPos = roomToScreen(item.position.x, item.position.y);
		const screenRadius = 8 * camera.zoom / 20;

		// Skip if off-screen
		if (screenPos.x < -screenRadius || screenPos.x > CANVAS_WIDTH + screenRadius ||
			screenPos.y < -screenRadius || screenPos.y > CANVAS_HEIGHT + screenRadius) {
			return;
		}

		// Draw technology circle
		ctx.fillStyle = '#ed8936';
		ctx.beginPath();
		ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, 2 * Math.PI);
		ctx.fill();

		// Draw border
		ctx.strokeStyle = '#2d3748';
		ctx.lineWidth = 1;
		ctx.stroke();

		// Draw label
		ctx.fillStyle = '#ffffff';
		ctx.font = `${Math.max(8, 10 * camera.zoom / 20)}px Arial`;
		ctx.textAlign = 'center';
		ctx.fillText(item.name || '', screenPos.x, screenPos.y + screenRadius + 12);
	};

	const drawSelectionHighlight = (ctx: CanvasRenderingContext2D, item: RoomFurniture) => {
		const screenPos = roomToScreen(item.x, item.y);
		const screenWidth = item.width * camera.zoom;
		const screenHeight = item.height * camera.zoom;

		ctx.strokeStyle = '#f6ad55';
		ctx.lineWidth = 3;
		ctx.setLineDash([5, 5]);
		ctx.strokeRect(screenPos.x - 2, screenPos.y - 2, screenWidth + 4, screenHeight + 4);
		ctx.setLineDash([]);
	};

	const drawTechnologySelectionHighlight = (ctx: CanvasRenderingContext2D, item: RoomTechnology) => {
		if (!item.position?.x || !item.position?.y) return;

		const screenPos = roomToScreen(item.position.x, item.position.y);
		const screenRadius = 8 * camera.zoom / 20;

		ctx.strokeStyle = '#f6ad55';
		ctx.lineWidth = 3;
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.arc(screenPos.x, screenPos.y, screenRadius + 2, 0, 2 * Math.PI);
		ctx.stroke();
		ctx.setLineDash([]);
	};

	const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;
		const roomPos = screenToRoom(screenX, screenY);

		setIsMouseDown(true);

		// Check if clicking on furniture
		const clickedFurniture = furniture.find(item => {
			const itemScreenPos = roomToScreen(item.x, item.y);
			const itemScreenWidth = item.width * camera.zoom;
			const itemScreenHeight = item.height * camera.zoom;

			return screenX >= itemScreenPos.x && screenX <= itemScreenPos.x + itemScreenWidth &&
				screenY >= itemScreenPos.y && screenY <= itemScreenPos.y + itemScreenHeight;
		});

		// Check if clicking on technology
		const clickedTechnology = technology.find((item: RoomTechnology) => {
			if (!item.position?.x || !item.position?.y) return false;
			const itemScreenPos = roomToScreen(item.position.x, item.position.y);
			const itemScreenRadius = 8 * camera.zoom / 20;
			const distance = Math.sqrt((screenX - itemScreenPos.x) ** 2 + (screenY - itemScreenPos.y) ** 2);
			return distance <= itemScreenRadius;
		});

		if (clickedFurniture) {
			setSelectedFurniture(clickedFurniture);
			setSelectedTechnology(null);
			setDragState({
				isDragging: true,
				dragType: 'furniture',
				dragId: clickedFurniture.id,
				startX: screenX,
				startY: screenY,
				currentX: screenX,
				currentY: screenY,
				originalPosition: { x: clickedFurniture.x, y: clickedFurniture.y },
			});
		} else if (clickedTechnology) {
			setSelectedTechnology(clickedTechnology);
			setSelectedFurniture(null);
			setDragState({
				isDragging: true,
				dragType: 'technology',
				dragId: clickedTechnology.id,
				startX: screenX,
				startY: screenY,
				currentX: screenX,
				currentY: screenY,
				originalPosition: { x: clickedTechnology.position?.x || 0, y: clickedTechnology.position?.y || 0 },
			});
		} else {
			// Clicked on empty space - start camera drag
			setSelectedFurniture(null);
			setSelectedTechnology(null);
			setDragState({
				isDragging: true,
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
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		if (dragState.isDragging) {
			setDragState(prev => ({
				...prev,
				currentX: screenX,
				currentY: screenY,
			}));

			if (dragState.dragType === 'furniture' && dragState.dragId && dragState.originalPosition) {
				const deltaX = (screenX - dragState.startX) / camera.zoom;
				const deltaY = (screenY - dragState.startY) / camera.zoom;

				const newX = Math.max(0, Math.min(roomTemplate.default_width - 1, dragState.originalPosition.x + deltaX));
				const newY = Math.max(0, Math.min(roomTemplate.default_height - 1, dragState.originalPosition.y + deltaY));

				setFurniture(prev => prev.map(item =>
					item.id === dragState.dragId
						? { ...item, x: newX, y: newY }
						: item,
				));
			} else if (dragState.dragType === 'technology' && dragState.dragId && dragState.originalPosition) {
				const deltaX = (screenX - dragState.startX) / camera.zoom;
				const deltaY = (screenY - dragState.startY) / camera.zoom;

				const newX = Math.max(0, Math.min(roomTemplate.default_width, dragState.originalPosition.x + deltaX));
				const newY = Math.max(0, Math.min(roomTemplate.default_height, dragState.originalPosition.y + deltaY));

				setTechnology(prev => prev.map(item =>
					item.id === dragState.dragId
						? { ...item, x: newX, y: newY }
						: item,
				));
			} else if (dragState.dragType === 'camera') {
				const deltaX = (screenX - dragState.startX) / camera.zoom;
				const deltaY = (screenY - dragState.startY) / camera.zoom;

				setCamera(prev => ({
					...prev,
					x: prev.x - deltaX,
					y: prev.y - deltaY,
				}));
			}
		}
	};

	const handleCanvasMouseUp = async () => {
		if (dragState.isDragging) {
			// Save changes if furniture or technology was moved
			if (dragState.dragType === 'furniture' || dragState.dragType === 'technology') {
				try {
					// Here you would save the changes to the backend
					// For now, we'll just log the changes
					console.log('Saving changes...');
				} catch (err) {
					console.error('Failed to save changes:', err);
					toast.error('Failed to save changes');
				}
			}

			setDragState({
				isDragging: false,
				dragType: 'none',
				dragId: null,
				startX: 0,
				startY: 0,
				currentX: 0,
				currentY: 0,
			});
		}
		setIsMouseDown(false);
	};

	const handleCanvasRightClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		event.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;
		const roomPos = screenToRoom(screenX, screenY);

		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			type: 'empty',
			roomX: roomPos.x,
			roomY: roomPos.y,
		});
	};

	const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
		event.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * zoomFactor));

		setCamera({
			zoom: newZoom,
			x: camera.x + (screenX - CANVAS_WIDTH / 2) / newZoom,
			y: camera.y + (screenY - CANVAS_HEIGHT / 2) / newZoom,
		});
	};

	const addFurniture = async (templateId: string) => {
		try {
			// Add furniture at center of room
			const newFurniture: RoomFurniture = {
				id: `temp-${Date.now()}`,
				name: 'New Furniture',
				furniture_type: 'generic',
				x: roomTemplate.default_width / 2,
				y: roomTemplate.default_height / 2,
				z: 1,
				width: 32,
				height: 32,
				rotation: 0,
				created_at: 0,
				updated_at: 0,
				room_id: '',
				interactive: false,
				blocks_movement: false,
				power_required: 0,
				active: false,
				discovered: false,
			};

			setFurniture(prev => [...prev, newFurniture]);
			setSelectedFurniture(newFurniture);
			setSelectedTechnology(null);
		} catch (err) {
			console.error('Failed to add furniture:', err);
			toast.error('Failed to add furniture');
		}
	};

	const addTechnology = async (templateId: string) => {
		try {
			// Add technology at center of room
			const newTechnology: RoomTechnology = {
				id: `temp-${Date.now()}`,
				technology_template_id: templateId,
				count: 1,
				created_at: 0,
				updated_at: 0,
				room_id: '',
				position: {
					x: roomTemplate.default_width / 2,
					y: roomTemplate.default_height / 2,
				},
			};

			setTechnology(prev => [...prev, newTechnology]);
			setSelectedTechnology(newTechnology);
			setSelectedFurniture(null);
		} catch (err) {
			console.error('Failed to add technology:', err);
			toast.error('Failed to add technology');
		}
	};

	const deleteFurniture = async (item: RoomFurniture) => {
		try {
			setFurniture(prev => prev.filter(f => f.id !== item.id));
			if (selectedFurniture?.id === item.id) {
				setSelectedFurniture(null);
			}
		} catch (err) {
			console.error('Failed to delete furniture:', err);
			toast.error('Failed to delete furniture');
		}
	};

	const deleteTechnology = async (item: RoomTechnology) => {
		try {
			setTechnology(prev => prev.filter(t => t.id !== item.id));
			if (selectedTechnology?.id === item.id) {
				setSelectedTechnology(null);
			}
		} catch (err) {
			console.error('Failed to delete technology:', err);
			toast.error('Failed to delete technology');
		}
	};

	if (loading) {
		return (
			<div className="d-flex justify-content-center align-items-center" style={{ height: '100%' }}>
				<div className="spinner-border" role="status">
					<span className="visually-hidden">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="room-template-visual-editor" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
			{error && (
				<Alert variant="danger" dismissible onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{/* Canvas Container */}
			<div className="flex-grow-1 position-relative" style={{ minHeight: '350px', maxHeight: '500px' }}>
				{/* Top Toolbar */}
				<div className="d-flex align-items-center gap-2 mb-2 p-2" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
					<small className="text-muted me-3">
						Room: {roomTemplate.default_width} × {roomTemplate.default_height} |
						Camera: ({camera.x.toFixed(1)}, {camera.y.toFixed(1)}) |
						Zoom: {(camera.zoom).toFixed(1)}x
					</small>

					<Dropdown>
						<Dropdown.Toggle variant="success" size="sm">
							<FaPlus className="me-1" />
							Add Furniture
						</Dropdown.Toggle>
						<Dropdown.Menu>
							{furnitureTemplates.map(template => (
								<Dropdown.Item
									key={template.id}
									onClick={() => addFurniture(template.id)}
								>
									<strong>{template.name}</strong>
									<div className="small text-muted">{template.category}</div>
								</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>

					<Dropdown>
						<Dropdown.Toggle variant="warning" size="sm">
							<FaPlus className="me-1" />
							Add Technology
						</Dropdown.Toggle>
						<Dropdown.Menu>
							{technologyTemplates.map(template => (
								<Dropdown.Item
									key={template.id}
									onClick={() => addTechnology(template.id)}
								>
									<strong>{template.name}</strong>
									<div className="small text-muted">{template.category}</div>
								</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>

					<Button
						size="sm"
						variant="outline-secondary"
						onClick={() => setCamera({
							x: roomTemplate.default_width / 2,
							y: roomTemplate.default_height / 2,
							zoom: 20.0,
						})}
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
						cursor: dragState.isDragging
							? (dragState.dragType === 'camera' ? 'grabbing' : 'move')
							: (selectedFurniture || selectedTechnology) ? 'move' : 'grab',
						maxWidth: '100%',
						height: 'auto',
					}}
					onMouseDown={handleCanvasMouseDown}
					onMouseMove={handleCanvasMouseMove}
					onMouseUp={handleCanvasMouseUp}
					onMouseLeave={handleCanvasMouseUp}
					onContextMenu={handleCanvasRightClick}
					onWheel={handleWheel}
				/>
			</div>

			{/* Context Menu */}
			{contextMenu.visible && (
				<div
					style={{
						position: 'fixed',
						top: contextMenu.y,
						left: contextMenu.x,
						backgroundColor: 'white',
						border: '1px solid #ccc',
						borderRadius: '4px',
						padding: '8px',
						boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
						zIndex: 1000,
					}}
					onMouseLeave={() => setContextMenu({ ...contextMenu, visible: false })}
				>
					<p className="mb-2 small text-muted">
						Position: ({contextMenu.roomX.toFixed(2)}, {contextMenu.roomY.toFixed(2)})
					</p>
					<Button size="sm" variant="outline-primary" className="w-100">
						Add Item Here
					</Button>
				</div>
			)}
		</div>
	);
};
