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

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 10.0;

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

	useEffect(() => {
		loadData();
	}, [roomTemplate.id]);


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

	const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
		event.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;
		console.log('[CANVAS] Screen position:', screenX, screenY);
	};

	const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
		event.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;
		console.log('[CANVAS] Screen position:', screenX, screenY);
	};

	const handleCanvasRightClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		event.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;
		console.log('[CANVAS] Screen position:', screenX, screenY);
		// const roomPos = screenToRoom(screenX, screenY);

		/*
		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			type: 'empty',
			roomX: roomPos.x,
			roomY: roomPos.y,
		});
		*/
	};

	const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
		event.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		const screenX = (event.clientX - rect.left) * scaleX;
		const screenY = (event.clientY - rect.top) * scaleY;

		const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.max(5.0, Math.min(50.0, camera.zoom * zoomFactor));

		setCamera({
			zoom: newZoom,
			x: camera.x + (screenX - canvas.width / 2) / newZoom,
			y: camera.y + (screenY - canvas.height / 2) / newZoom,
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
		<div className="room-template-visual-editor">
			{error && (
				<Alert variant="danger" dismissible onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{/* Canvas Container */}
			<div className="flex-grow-1 position-relative" style={{ minHeight: '350px', maxHeight: '500px' }}>

				{/* Canvas
				<canvas
					ref={canvasRef}
					style={{
						border: '1px solid #ccc',
						backgroundColor: '#1a202c',
						cursor: dragState.isDragging
							? (dragState.dragType === 'camera' ? 'grabbing' : 'move')
							: (selectedFurniture || selectedTechnology) ? 'move' : 'grab',
					}}
					onMouseDown={handleCanvasMouseDown}
					onMouseMove={handleCanvasMouseMove}
					onMouseUp={handleCanvasMouseUp}
					onMouseLeave={handleCanvasMouseUp}
					onContextMenu={handleCanvasRightClick}
					onWheel={handleWheel}
				/>
				*/}
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
