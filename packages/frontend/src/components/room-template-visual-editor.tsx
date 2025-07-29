import type {
	RoomTemplate,
	RoomFurniture,
	RoomTechnology,
	FurnitureTemplate,
	TechnologyTemplate,
} from '@stargate/common';
import { mergeFurnitureWithTemplate } from '@stargate/common';
import React, { useState, useEffect, useRef } from 'react';
import { Button, Alert, Dropdown } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { AdminService } from '../services/admin-service';
import { apiClient } from '../services/api-client';

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

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 10.0;

interface EditFurnitureFormProps {
	furniture: RoomFurniture;
	furnitureTemplates: FurnitureTemplate[];
	onSave: (updatedFurniture: RoomFurniture) => void;
	onCancel: () => void;
}

const EditFurnitureForm: React.FC<EditFurnitureFormProps> = ({ furniture, furnitureTemplates, onSave, onCancel }) => {
	const [formData, setFormData] = useState({
		name: furniture.name,
		furniture_type: furniture.furniture_type,
		x: furniture.x,
		y: furniture.y,
		width: furniture.width,
		height: furniture.height,
	});

	// Get unique furniture types from templates
	const furnitureTypes = Array.from(new Set(furnitureTemplates.map(t => t.furniture_type))).sort();

	const handleInputChange = (field: keyof typeof formData, value: string | number) => {
		setFormData(prev => ({
			...prev,
			[field]: typeof value === 'number' ? Math.max(1, Math.round(value)) : value, // Ensure positive integers for numeric fields
		}));
	};

	const handleSave = () => {
		const updatedFurniture: RoomFurniture = {
			...furniture,
			name: formData.name,
			furniture_type: formData.furniture_type,
			x: formData.x,
			y: formData.y,
			width: formData.width,
			height: formData.height,
		};
		onSave(updatedFurniture);
	};

	return (
		<div>
			<div className="mb-3">
				<label className="form-label text-light">Name</label>
				<input
					type="text"
					className="form-control bg-dark text-light border-secondary"
					placeholder="Furniture Name"
					value={formData.name}
					onChange={(e) => handleInputChange('name', e.target.value)}
				/>
			</div>

			<div className="mb-3">
				<label className="form-label text-light">Type</label>
				<select
					className="form-select bg-dark text-light border-secondary"
					value={formData.furniture_type}
					onChange={(e) => handleInputChange('furniture_type', e.target.value)}
				>
					{furnitureTypes.map((type) => (
						<option key={type} value={type}>
							{type}
						</option>
					))}
				</select>
			</div>

			<div className="mb-3">
				<label className="form-label text-light">Position (relative to room center)</label>
				<div className="row g-2">
					<div className="col-6">
						<input
							type="number"
							className="form-control bg-dark text-light border-secondary"
							placeholder="X"
							value={formData.x}
							onChange={(e) => handleInputChange('x', parseInt(e.target.value) || 0)}
						/>
					</div>
					<div className="col-6">
						<input
							type="number"
							className="form-control bg-dark text-light border-secondary"
							placeholder="Y"
							value={formData.y}
							onChange={(e) => handleInputChange('y', parseInt(e.target.value) || 0)}
						/>
					</div>
				</div>
				<small className="text-muted">(0,0) = room center, negative = left/up, positive = right/down</small>
			</div>

			<div className="mb-3">
				<label className="form-label text-light">Size</label>
				<div className="row g-2">
					<div className="col-6">
						<input
							type="number"
							className="form-control bg-dark text-light border-secondary"
							placeholder="Width"
							value={formData.width}
							onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 1)}
							min="1"
						/>
					</div>
					<div className="col-6">
						<input
							type="number"
							className="form-control bg-dark text-light border-secondary"
							placeholder="Height"
							value={formData.height}
							onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 1)}
							min="1"
						/>
					</div>
				</div>
			</div>

			<div className="d-flex gap-2">
				<Button variant="outline-light" onClick={onCancel} className="flex-fill">
					Cancel
				</Button>
				<Button variant="primary" onClick={handleSave} className="flex-fill">
					Save Changes
				</Button>
			</div>
		</div>
	);
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

	const [showFurniturePopup, setShowFurniturePopup] = useState(false);
	const [furniturePopupPosition, setFurniturePopupPosition] = useState({ x: 0, y: 0 });

	const [showEditFurniturePopup, setShowEditFurniturePopup] = useState(false);
	const [editingFurniture, setEditingFurniture] = useState<RoomFurniture | null>(null);

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

		// Convert to room-relative coordinates (0,0 at room center)
		const roomRelativeX = roomX - roomTemplate.default_width / 2;
		const roomRelativeY = roomY - roomTemplate.default_height / 2;

		return {
			x: snapToGrid(roomRelativeX),
			y: snapToGrid(roomRelativeY),
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

			console.log('Room template furniture data:', furnitureData);
			console.log('Room template technology data:', technologyData);

			// Convert room template furniture data to RoomFurniture format
			const convertedFurniture: RoomFurniture[] = furnitureData.map((item: any) => ({
				id: item.id,
				room_id: item.room_template_id, // Use room_template_id as room_id for display purposes
				furniture_type: item.furniture_type || 'generic',
				name: item.name,
				description: item.description,
				x: item.x,
				y: item.y,
				z: item.z,
				width: item.width,
				height: item.height,
				rotation: item.rotation,
				image: item.image ? JSON.parse(item.image) : undefined,
				color: item.color,
				style: item.style,
				interactive: item.interactive === 1,
				blocks_movement: item.blocks_movement === 1,
				requirements: item.optional_variants,
				power_required: item.power_required || 0,
				active: true, // Default to active
				discovered: true, // Default to discovered
				created_at: item.created_at,
				updated_at: item.updated_at,
			}));

			console.log('Converted furniture:', convertedFurniture);

			setFurniture(convertedFurniture);
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
			// Find the furniture template
			const template = furnitureTemplates.find(t => t.id === templateId);
			if (!template) {
				toast.error('Furniture template not found');
				return;
			}

			// Create base furniture data with position
			const baseFurniture = {
				room_id: roomTemplate.id, // Use room template ID
				x: x ?? 0, // Room center
				y: y ?? 0, // Room center
				z: 1,
			};

			// Merge template defaults with base furniture data
			const mergedFurniture = mergeFurnitureWithTemplate(baseFurniture, template);

			// Save to backend
			const response = await apiClient.post(`/api/admin/room-templates/${roomTemplate.id}/furniture`, {
				furniture_template_id: templateId,
				name: mergedFurniture.name,
				description: mergedFurniture.description,
				x: mergedFurniture.x,
				y: mergedFurniture.y,
				z: mergedFurniture.z,
				width: mergedFurniture.width,
				height: mergedFurniture.height,
				rotation: mergedFurniture.rotation,
				image: mergedFurniture.image,
				color: mergedFurniture.color,
				style: mergedFurniture.style,
				interactive: mergedFurniture.interactive,
				blocks_movement: mergedFurniture.blocks_movement,
				power_required: mergedFurniture.power_required,
			}, true);

			if (response.error) {
				throw new Error(response.error);
			}

			// Reload data to get the updated furniture list
			await loadData();
			toast.success(`Added ${template.name}`);
		} catch (err) {
			console.error('Failed to add furniture:', err);
			toast.error('Failed to add furniture');
		}
	};

	const addTechnology = async (templateId: string, x?: number, y?: number) => {
		try {
			// Add technology at specified position or center of room (0,0)
			const newTechnology: RoomTechnology = {
				id: `temp-${Date.now()}`,
				technology_template_id: templateId,
				count: 1,
				created_at: 0,
				updated_at: 0,
				room_id: '',
				position: {
					x: x ?? 0, // Room center
					y: y ?? 0, // Room center
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
									left: roomTemplate.default_width / 2 + item.x - item.width / 2,
									top: roomTemplate.default_height / 2 + item.y - item.height / 2,
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
										left: roomTemplate.default_width / 2 + item.position.x - 8,
										top: roomTemplate.default_height / 2 + item.position.y - 8,
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
										setFurniturePopupPosition({ x: contextMenu.roomX, y: contextMenu.roomY });
										setShowFurniturePopup(true);
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
										const item = furniture.find(f => f.id === contextMenu.targetId);
										if (item) {
											setEditingFurniture(item);
											setShowEditFurniturePopup(true);
										}
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

				{/* Furniture Selection Popup */}
				{showFurniturePopup && (
					<div
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							backgroundColor: 'rgba(0, 0, 0, 0.7)',
							zIndex: 1001,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
						onClick={() => setShowFurniturePopup(false)}
					>
						<div
							style={{
								backgroundColor: '#1a1a1a',
								border: '1px solid #333',
								borderRadius: '8px',
								padding: '20px',
								maxWidth: '500px',
								maxHeight: '80vh',
								overflow: 'auto',
								color: 'white',
								minWidth: '400px',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="d-flex justify-content-between align-items-center mb-3">
								<h5 className="mb-0">Add Furniture</h5>
								<Button
									variant="outline-light"
									size="sm"
									onClick={() => setShowFurniturePopup(false)}
								>
									×
								</Button>
							</div>

							<p className="text-muted mb-3">
								Position: ({furniturePopupPosition.x}, {furniturePopupPosition.y})
							</p>

							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '8px',
									justifyContent: 'flex-start',
								}}
							>
								{furnitureTemplates.map((template) => (
									<Button
										key={template.id}
										variant="outline-light"
										className="text-start p-3"
										style={{
											flex: '1 1 200px',
											minHeight: '80px',
											maxWidth: 'calc(50% - 4px)',
											borderRadius: '6px',
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'center',
										}}
										onClick={() => {
											addFurniture(template.id, furniturePopupPosition.x, furniturePopupPosition.y);
											setShowFurniturePopup(false);
											toast.success(`Added ${template.name}`);
										}}
									>
										<div className="d-flex flex-column">
											<strong>{template.name}</strong>
											<small className="text-muted">
												{template.default_width}×{template.default_height}
											</small>
										</div>
									</Button>
								))}
							</div>

							{furnitureTemplates.length === 0 && (
								<div className="text-center text-muted py-4">
									No furniture templates available
								</div>
							)}
						</div>
					</div>
				)}

				{/* Edit Furniture Popup */}
				{showEditFurniturePopup && editingFurniture && (
					<div
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							backgroundColor: 'rgba(0, 0, 0, 0.7)',
							zIndex: 1001,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
						onClick={() => setShowEditFurniturePopup(false)}
					>
						<div
							style={{
								backgroundColor: '#1a1a1a',
								border: '1px solid #333',
								borderRadius: '8px',
								padding: '20px',
								maxWidth: '400px',
								color: 'white',
								minWidth: '350px',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="d-flex justify-content-between align-items-center mb-3">
								<h5 className="mb-0">Edit Furniture</h5>
								<Button
									variant="outline-light"
									size="sm"
									onClick={() => setShowEditFurniturePopup(false)}
								>
									×
								</Button>
							</div>

							<EditFurnitureForm
								furniture={editingFurniture}
								furnitureTemplates={furnitureTemplates}
								onSave={(updatedFurniture) => {
									setFurniture(prev => prev.map(f =>
										f.id === editingFurniture.id ? updatedFurniture : f,
									));
									setShowEditFurniturePopup(false);
									setEditingFurniture(null);
									toast.success('Furniture updated successfully');
								}}
								onCancel={() => {
									setShowEditFurniturePopup(false);
									setEditingFurniture(null);
								}}
							/>
						</div>
					</div>
				)}
			</div>
		</>
	);
};
