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

export const RoomTemplateVisualEditor: React.FC<RoomTemplateVisualEditorProps> = ({ roomTemplate, onSave, onRoomSizeChange }) => {
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

	const adminService = new AdminService();

	// Utility functions for grid snapping and coordinate conversion
	const snapToGrid = (value: number): number => Math.round(value);

	const screenToRoom = (screenX: number, screenY: number, containerRect: DOMRect): { x: number; y: number } => {
		const roomRect = {
			left: containerRect.left + (containerRect.width - roomTemplate.default_width) / 2,
			top: containerRect.top + (containerRect.height - roomTemplate.default_height) / 2,
		};

		const roomX = screenX - roomRect.left;
		const roomY = screenY - roomRect.top;

		return {
			x: snapToGrid(roomX),
			y: snapToGrid(roomY),
		};
	};

	const findItemAtPosition = (x: number, y: number): { type: 'furniture' | 'technology' | 'empty'; item?: RoomFurniture | RoomTechnology } => {
		// Check furniture first
		for (const item of furniture) {
			if (x >= item.x && x < item.x + item.width && y >= item.y && y < item.y + item.height) {
				return { type: 'furniture', item };
			}
		}

		// Check technology
		for (const item of technology) {
			if (item.position?.x !== null && item.position?.x !== undefined &&
				item.position?.y !== null && item.position?.y !== undefined) {
				if (x >= item.position.x && x < item.position.x + 1 && y >= item.position.y && y < item.position.y + 1) {
					return { type: 'technology', item };
				}
			}
		}

		return { type: 'empty' };
	};

	useEffect(() => {
		loadData();
	}, [roomTemplate.id]);

	// Close context menu when clicking outside
	useEffect(() => {
		const handleGlobalClick = (event: MouseEvent) => {
			if (contextMenu.visible) {
				setContextMenu(prev => ({ ...prev, visible: false }));
			}
		};

		document.addEventListener('click', handleGlobalClick);
		return () => document.removeEventListener('click', handleGlobalClick);
	}, [contextMenu.visible]);


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

	const handleRoomMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		const container = event.currentTarget;
		const rect = container.getBoundingClientRect();
		const roomPos = screenToRoom(event.clientX, event.clientY, rect);

		// Check if clicking on an item
		const itemAtPosition = findItemAtPosition(roomPos.x, roomPos.y);

		if (itemAtPosition.type !== 'empty') {
			// Start dragging the item
			setDragState({
				isDragging: true,
				dragType: itemAtPosition.type,
				dragId: itemAtPosition.item?.id || null,
				startX: event.clientX,
				startY: event.clientY,
				currentX: event.clientX,
				currentY: event.clientY,
				originalPosition: itemAtPosition.type === 'furniture'
					? { x: (itemAtPosition.item as RoomFurniture).x, y: (itemAtPosition.item as RoomFurniture).y }
					: { x: (itemAtPosition.item as RoomTechnology).position?.x || 0, y: (itemAtPosition.item as RoomTechnology).position?.y || 0 },
			});

			// Select the item
			if (itemAtPosition.type === 'furniture') {
				setSelectedFurniture(itemAtPosition.item as RoomFurniture);
				setSelectedTechnology(null);
			} else {
				setSelectedTechnology(itemAtPosition.item as RoomTechnology);
				setSelectedFurniture(null);
			}
		} else {
			// Clear selection if clicking on empty space
			setSelectedFurniture(null);
			setSelectedTechnology(null);
		}

		setIsMouseDown(true);
	};

	const handleRoomMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
		if (!dragState.isDragging) return;

		event.preventDefault();
		const container = event.currentTarget;
		const rect = container.getBoundingClientRect();
		const roomPos = screenToRoom(event.clientX, event.clientY, rect);

		setDragState(prev => ({
			...prev,
			currentX: event.clientX,
			currentY: event.clientY,
		}));

		// Update item position
		if (dragState.dragType === 'furniture' && dragState.dragId) {
			const item = furniture.find(f => f.id === dragState.dragId);
			if (item) {
				setFurniture(prev => prev.map(f =>
					f.id === dragState.dragId
						? { ...f, x: roomPos.x, y: roomPos.y }
						: f,
				));
			}
		} else if (dragState.dragType === 'technology' && dragState.dragId) {
			const item = technology.find(t => t.id === dragState.dragId);
			if (item) {
				setTechnology(prev => prev.map(t =>
					t.id === dragState.dragId
						? { ...t, position: { x: roomPos.x, y: roomPos.y } }
						: t,
				));
			}
		}
	};

	const handleRoomMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
		handleCanvasMouseUp();
	};

	const handleRoomRightClick = (event: React.MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		const container = event.currentTarget;
		const rect = container.getBoundingClientRect();
		const roomPos = screenToRoom(event.clientX, event.clientY, rect);

		// Check if right-clicking on an item
		const itemAtPosition = findItemAtPosition(roomPos.x, roomPos.y);

		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			type: itemAtPosition.type,
			targetId: itemAtPosition.item?.id,
			roomX: roomPos.x,
			roomY: roomPos.y,
		});
	};

	const addFurniture = async (templateId: string, x?: number, y?: number) => {
		try {
			// Add furniture at specified position or center of room
			const newFurniture: RoomFurniture = {
				id: `temp-${Date.now()}`,
				name: 'New Furniture',
				furniture_type: 'generic',
				x: x ?? roomTemplate.default_width / 2,
				y: y ?? roomTemplate.default_height / 2,
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

	const addTechnology = async (templateId: string, x?: number, y?: number) => {
		try {
			// Add technology at specified position or center of room
			const newTechnology: RoomTechnology = {
				id: `temp-${Date.now()}`,
				technology_template_id: templateId,
				count: 1,
				created_at: 0,
				updated_at: 0,
				room_id: '',
				position: {
					x: x ?? roomTemplate.default_width / 2,
					y: y ?? roomTemplate.default_height / 2,
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
		<>
			<div className="room-template-visual-editor g-0" style={{
				height: '100%',
			}}>
				{error && (
					<Alert variant="danger" dismissible onClose={() => setError(null)}>
						{error}
					</Alert>
				)}

				{/* Canvas Container */}
				<div className="room-container g-0" style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
					<div
						className="room g-0"
						style={{
							width: roomTemplate.default_width,
							height: roomTemplate.default_height,
							border: '2px solid cyan',
							position: 'relative',
							backgroundColor: '#1a202c',
							cursor: dragState.isDragging ? 'grabbing' : 'grab',
						}}
						onMouseDown={handleRoomMouseDown}
						onMouseUp={handleRoomMouseUp}
						onMouseMove={handleRoomMouseMove}
						onContextMenu={handleRoomRightClick}
					>
						{/* Render Furniture Items */}
						{furniture.map((item) => (
							<div
								key={item.id}
								style={{
									position: 'absolute',
									left: item.x,
									top: item.y,
									width: item.width,
									height: item.height,
									backgroundColor: selectedFurniture?.id === item.id ? '#ff6b6b' : '#4ecdc4',
									border: selectedFurniture?.id === item.id ? '2px solid #ff4757' : '1px solid #2c3e50',
									borderRadius: '2px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '10px',
									color: 'white',
									userSelect: 'none',
									zIndex: 10,
								}}
							>
								{item.name}
							</div>
						))}

						{/* Render Technology Items */}
						{technology.map((item) => (
							item.position?.x !== null && item.position?.x !== undefined &&
							item.position?.y !== null && item.position?.y !== undefined && (
								<div
									key={item.id}
									style={{
										position: 'absolute',
										left: item.position.x,
										top: item.position.y,
										width: 16,
										height: 16,
										backgroundColor: selectedTechnology?.id === item.id ? '#ff6b6b' : '#f39c12',
										border: selectedTechnology?.id === item.id ? '2px solid #ff4757' : '1px solid #2c3e50',
										borderRadius: '50%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: '8px',
										color: 'white',
										userSelect: 'none',
										zIndex: 10,
									}}
								>
									T
								</div>
							)
						))}
					</div>
				</div>

				{/* Context Menu */}
				{contextMenu.visible && (
					<div
						style={{
							position: 'fixed',
							top: contextMenu.y,
							left: contextMenu.x,
							backgroundColor: '#1a1a1a',
							border: '1px solid #333',
							borderRadius: '6px',
							padding: '12px',
							boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
							zIndex: 1000,
							minWidth: '180px',
							color: 'white',
						}}
						onMouseLeave={() => setContextMenu({ ...contextMenu, visible: false })}
					>
						{contextMenu.type === 'empty' && (
							<>
								<Button
									size="sm"
									variant="outline-light"
									className="w-100 mb-2"
									onClick={() => {
										// TODO: Show furniture selection popup
										toast.info('Furniture selection popup coming soon');
										setContextMenu({ ...contextMenu, visible: false });
									}}
								>
									Add Furniture
								</Button>
							</>
						)}

						{contextMenu.type === 'furniture' && contextMenu.targetId && (
							<>
								<Button
									size="sm"
									variant="outline-light"
									className="w-100 mb-2"
									onClick={() => {
										// TODO: Show furniture edit popup
										toast.info('Furniture edit popup coming soon');
										setContextMenu({ ...contextMenu, visible: false });
									}}
								>
									Edit Furniture
								</Button>

								<Button
									size="sm"
									variant="outline-danger"
									className="w-100"
									onClick={() => {
										const item = furniture.find(f => f.id === contextMenu.targetId);
										if (item) {
											deleteFurniture(item);
										}
										setContextMenu({ ...contextMenu, visible: false });
									}}
								>
									Delete Furniture
								</Button>
							</>
						)}

						{contextMenu.type === 'technology' && contextMenu.targetId && (
							<>
								<Button
									size="sm"
									variant="outline-light"
									className="w-100 mb-2"
									onClick={() => {
										// TODO: Show technology edit popup
										toast.info('Technology edit popup coming soon');
										setContextMenu({ ...contextMenu, visible: false });
									}}
								>
									Edit Technology
								</Button>

								<Button
									size="sm"
									variant="outline-danger"
									className="w-100"
									onClick={() => {
										const item = technology.find(t => t.id === contextMenu.targetId);
										if (item) {
											deleteTechnology(item);
										}
										setContextMenu({ ...contextMenu, visible: false });
									}}
								>
									Delete Technology
								</Button>
							</>
						)}

						{/* Position footer */}
						<div
							style={{
								marginTop: '12px',
								paddingTop: '8px',
								borderTop: '1px solid #333',
								textAlign: 'center',
							}}
						>
							<small className="text-muted">
								Position: ({contextMenu.roomX}, {contextMenu.roomY})
							</small>
						</div>
					</div>
				)}
			</div>
		</>
	);
};
