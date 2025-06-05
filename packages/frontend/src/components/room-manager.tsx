import { RoomTemplate, TechnologyTemplate } from '@stargate/common';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Card, Badge, Dropdown, Spinner } from 'react-bootstrap';
import { FaPlus, FaLink, FaSync, FaCog } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { useGameState } from '../contexts/game-state-context';
import { useGameService } from '../services/game-service';

interface RoomManagerProps {
	currentRoom?: RoomTemplate;
	allRooms: RoomTemplate[];
	onRoomAdded?: (room: RoomTemplate) => void;
	onRoomUpdated?: (room: RoomTemplate) => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({
	currentRoom,
	allRooms,
	onRoomAdded,
	onRoomUpdated,
}) => {
	const {
		addRoomToGame,
		updateRoomConnections,
		getAvailableRoomTemplates,
		syncRoomFromTemplate,
	} = useGameState();

	const [showAddModal, setShowAddModal] = useState(false);
	const [showConnectionModal, setShowConnectionModal] = useState(false);
	const [showSyncModal, setShowSyncModal] = useState(false);

	const [availableTemplates, setAvailableTemplates] = useState<RoomTemplate[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const [roomConfig, setRoomConfig] = useState({
		name: '',
		description: '',
		found: false,
		locked: false,
		explored: false,
		status: 'ok' as const,
	});

	const [connections, setConnections] = useState({
		north: '',
		south: '',
		east: '',
		west: '',
	});

	// Load available templates when component mounts
	useEffect(() => {
		const loadTemplates = async () => {
			try {
				setIsLoading(true);
				const templates = await getAvailableRoomTemplates();
				setAvailableTemplates(templates);
			} catch (error) {
				console.error('Failed to load available templates:', error);
				toast.error('Failed to load room templates');
			} finally {
				setIsLoading(false);
			}
		};

		loadTemplates();
	}, [getAvailableRoomTemplates]);

	// Initialize connections when current room changes
	useEffect(() => {
		if (currentRoom) {
			setConnections({
				north: currentRoom.connection_north || '',
				south: currentRoom.connection_south || '',
				east: currentRoom.connection_east || '',
				west: currentRoom.connection_west || '',
			});
		}
	}, [currentRoom]);

	const handleAddRoom = async () => {
		if (!selectedTemplate) {
			toast.error('Please select a room template');
			return;
		}

		try {
			setIsLoading(true);

			// Prepare connections (only include non-empty values)
			const roomConnections: Record<string, string> = {};
			for (const [direction, roomId] of Object.entries(connections)) {
				if (roomId.trim()) {
					roomConnections[direction] = roomId.trim();
				}
			}

			const newRoom = await addRoomToGame(selectedTemplate.id, {
				...roomConfig,
				name: roomConfig.name || selectedTemplate.name,
				description: roomConfig.description || selectedTemplate.description,
				connections: Object.keys(roomConnections).length > 0 ? roomConnections : undefined,
			});

			toast.success(`Added room "${newRoom.name}" to the game!`);
			onRoomAdded?.(newRoom);
			setShowAddModal(false);
			resetForm();

		} catch (error: any) {
			console.error('Failed to add room:', error);
			toast.error(error.message || 'Failed to add room to game');
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpdateConnections = async () => {
		if (!currentRoom) {
			toast.error('No room selected');
			return;
		}

		try {
			setIsLoading(true);

			// Convert connections to the format expected by the API
			const connectionUpdates: Record<string, string | null> = {};
			for (const [direction, roomId] of Object.entries(connections)) {
				connectionUpdates[`connection_${direction}`] = roomId.trim() || null;
			}

			await updateRoomConnections(currentRoom.id, connectionUpdates);

			toast.success(`Updated connections for "${currentRoom.name}"`);
			onRoomUpdated?.(currentRoom);
			setShowConnectionModal(false);

		} catch (error: any) {
			console.error('Failed to update connections:', error);
			toast.error(error.message || 'Failed to update room connections');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSyncRoom = async () => {
		if (!currentRoom) {
			toast.error('No room selected');
			return;
		}

		try {
			setIsLoading(true);

			const result = await syncRoomFromTemplate(currentRoom.id);

			toast.success(`Synced "${currentRoom.name}" with template (updated: ${result.updatedFields.join(', ')})`);
			onRoomUpdated?.(currentRoom);
			setShowSyncModal(false);

		} catch (error: any) {
			console.error('Failed to sync room:', error);
			toast.error(error.message || 'Failed to sync room with template');
		} finally {
			setIsLoading(false);
		}
	};

	const resetForm = () => {
		setSelectedTemplate(null);
		setRoomConfig({
			name: '',
			description: '',
			found: false,
			locked: false,
			explored: false,
			status: 'ok',
		});
		setConnections({
			north: '',
			south: '',
			east: '',
			west: '',
		});
	};

	const getConnectedRoomName = (roomId: string) => {
		const room = allRooms.find(r => r.id === roomId);
		return room ? room.name : 'Unknown Room';
	};

	return (
		<div className="room-manager">
			<div className="d-flex gap-2 mb-3">
				<Button
					variant="primary"
					onClick={() => setShowAddModal(true)}
					disabled={isLoading}
				>
					<FaPlus className="me-1" />
					Add Room from Template
				</Button>

				{currentRoom && (
					<>
						<Button
							variant="outline-secondary"
							onClick={() => setShowConnectionModal(true)}
							disabled={isLoading}
						>
							<FaLink className="me-1" />
							Edit Connections
						</Button>

						<Button
							variant="outline-info"
							onClick={() => setShowSyncModal(true)}
							disabled={isLoading}
						>
							<FaSync className="me-1" />
							Sync with Template
						</Button>
					</>
				)}
			</div>

			{/* Add Room Modal */}
			<Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Add Room from Template</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{isLoading ? (
						<div className="text-center">
							<Spinner animation="border" />
							<p>Loading templates...</p>
						</div>
					) : (
						<>
							<Form.Group className="mb-3">
								<Form.Label>Room Template</Form.Label>
								<div className="row">
									{availableTemplates.map(template => (
										<div key={template.id} className="col-md-6 mb-2">
											<Card
												className={`cursor-pointer ${selectedTemplate?.id === template.id ? 'border-primary' : ''}`}
												onClick={() => setSelectedTemplate(template)}
											>
												<Card.Body className="p-2">
													<div className="d-flex justify-content-between align-items-start">
														<div>
															<strong>{template.name}</strong>
															<Badge bg="secondary" className="ms-2">{template.type}</Badge>
														</div>
														<small className="text-muted">{template.width}×{template.height}</small>
													</div>
													{template.description && (
														<small className="text-muted d-block mt-1">
															{template.description.length > 50
																? `${template.description.substring(0, 50)}...`
																: template.description
															}
														</small>
													)}
												</Card.Body>
											</Card>
										</div>
									))}
								</div>
							</Form.Group>

							{selectedTemplate && (
								<>
									<Form.Group className="mb-3">
										<Form.Label>Room Name (override)</Form.Label>
										<Form.Control
											type="text"
											value={roomConfig.name}
											onChange={(e) => setRoomConfig(prev => ({ ...prev, name: e.target.value }))}
											placeholder={selectedTemplate.name}
										/>
									</Form.Group>

									<Form.Group className="mb-3">
										<Form.Label>Description (override)</Form.Label>
										<Form.Control
											as="textarea"
											rows={2}
											value={roomConfig.description}
											onChange={(e) => setRoomConfig(prev => ({ ...prev, description: e.target.value }))}
											placeholder={selectedTemplate.description || ''}
										/>
									</Form.Group>

									<div className="row mb-3">
										<div className="col-md-3">
											<Form.Check
												type="checkbox"
												label="Found"
												checked={roomConfig.found}
												onChange={(e) => setRoomConfig(prev => ({ ...prev, found: e.target.checked }))}
											/>
										</div>
										<div className="col-md-3">
											<Form.Check
												type="checkbox"
												label="Locked"
												checked={roomConfig.locked}
												onChange={(e) => setRoomConfig(prev => ({ ...prev, locked: e.target.checked }))}
											/>
										</div>
										<div className="col-md-3">
											<Form.Check
												type="checkbox"
												label="Explored"
												checked={roomConfig.explored}
												onChange={(e) => setRoomConfig(prev => ({ ...prev, explored: e.target.checked }))}
											/>
										</div>
										<div className="col-md-3">
											<Form.Group>
												<Form.Label className="small">Status</Form.Label>
												<Form.Select
													size="sm"
													value={roomConfig.status}
													onChange={(e) => setRoomConfig(prev => ({ ...prev, status: e.target.value as any }))}
												>
													<option value="ok">OK</option>
													<option value="damaged">Damaged</option>
													<option value="destroyed">Destroyed</option>
													<option value="unknown">Unknown</option>
												</Form.Select>
											</Form.Group>
										</div>
									</div>

									<Card className="mb-3">
										<Card.Header>Initial Connections (optional)</Card.Header>
										<Card.Body>
											<div className="row">
												{['north', 'south', 'east', 'west'].map(direction => (
													<div key={direction} className="col-md-6 mb-2">
														<Form.Group>
															<Form.Label className="text-capitalize small">{direction}</Form.Label>
															<Form.Select
																size="sm"
																value={connections[direction as keyof typeof connections]}
																onChange={(e) => setConnections(prev => ({ ...prev, [direction]: e.target.value }))}
															>
																<option value="">No connection</option>
																{allRooms.map(room => (
																	<option key={room.id} value={room.id}>{room.name}</option>
																))}
															</Form.Select>
														</Form.Group>
													</div>
												))}
											</div>
										</Card.Body>
									</Card>
								</>
							)}
						</>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowAddModal(false)}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={handleAddRoom}
						disabled={!selectedTemplate || isLoading}
					>
						{isLoading ? <Spinner animation="border" size="sm" className="me-1" /> : null}
						Add Room
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Connection Edit Modal */}
			<Modal show={showConnectionModal} onHide={() => setShowConnectionModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Edit Room Connections</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{currentRoom && (
						<>
							<Alert variant="info">
								Editing connections for: <strong>{currentRoom.name}</strong>
							</Alert>
							<div className="row">
								{['north', 'south', 'east', 'west'].map(direction => (
									<div key={direction} className="col-md-6 mb-3">
										<Form.Group>
											<Form.Label className="text-capitalize">{direction}</Form.Label>
											<Form.Select
												value={connections[direction as keyof typeof connections]}
												onChange={(e) => setConnections(prev => ({ ...prev, [direction]: e.target.value }))}
											>
												<option value="">No connection</option>
												{allRooms
													.filter(room => room.id !== currentRoom.id)
													.map(room => (
														<option key={room.id} value={room.id}>{room.name}</option>
													))
												}
											</Form.Select>
											{connections[direction as keyof typeof connections] && (
												<Form.Text className="text-muted">
													Connected to: {getConnectedRoomName(connections[direction as keyof typeof connections])}
												</Form.Text>
											)}
										</Form.Group>
									</div>
								))}
							</div>
						</>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowConnectionModal(false)}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={handleUpdateConnections}
						disabled={isLoading}
					>
						{isLoading ? <Spinner animation="border" size="sm" className="me-1" /> : null}
						Update Connections
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Sync Modal */}
			<Modal show={showSyncModal} onHide={() => setShowSyncModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Sync Room with Template</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{currentRoom && (
						<>
							<Alert variant="warning">
								<strong>Warning:</strong> This will update the room&apos;s properties (name, description, size, etc.)
								to match the latest template data. Game state (found, explored, connections) will be preserved.
							</Alert>
							<p>
								<strong>Room:</strong> {currentRoom.name}<br />
								<strong>Template ID:</strong> {currentRoom.template_id}<br />
								<strong>Type:</strong> {currentRoom.type}
							</p>
						</>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowSyncModal(false)}>
						Cancel
					</Button>
					<Button
						variant="warning"
						onClick={handleSyncRoom}
						disabled={isLoading}
					>
						{isLoading ? <Spinner animation="border" size="sm" className="me-1" /> : null}
						Sync with Template
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};
