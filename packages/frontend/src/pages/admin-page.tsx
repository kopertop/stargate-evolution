import { RoomTemplate, TechnologyTemplate } from '@stargate/common';
import { RoomTechnology } from '@stargate/common/models/room-technology';
import Fuse from 'fuse.js';
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Nav, Tab, Table, Modal, Form, Alert, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import { FaEdit, FaTrash, FaPlus, FaArrowLeft, FaSearch, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { getSession, validateOrRefreshSession } from '../auth/session';
import { RoomEditVisualization } from '../components/room-edit-visualization';
import { adminService } from '../services/admin-service';
import { apiService } from '../services/api-service';

type User = {
	id: string;
	email: string;
	name: string;
	image?: string;
	is_admin: boolean;
	created_at: number;
	updated_at: number;
};

export const AdminPage: React.FC = () => {
	const navigate = useNavigate();

	// Helper function to truncate text and show tooltip
	const truncateWithTooltip = (text: string, maxLength: number = 25) => {
		if (!text || text.length <= maxLength) {
			return <span>{text}</span>;
		}

		const truncated = text.substring(0, maxLength) + '...';
		return (
			<OverlayTrigger
				placement="top"
				overlay={<Tooltip id={`tooltip-${Date.now()}`}>{text}</Tooltip>}
			>
				<span style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
					{truncated}
				</span>
			</OverlayTrigger>
		);
	};
	const [activeTab, setActiveTab] = useState('users');
	const [users, setUsers] = useState<User[]>([]);
	const [rooms, setRooms] = useState<RoomTemplate[]>([]);
	const [technologies, setTechnologies] = useState<TechnologyTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Search states
	const [userSearch, setUserSearch] = useState('');
	const [roomSearch, setRoomSearch] = useState('');
	const [techSearch, setTechSearch] = useState('');
	const [selectedFloor, setSelectedFloor] = useState(0);

	// Modal states
	const [showUserModal, setShowUserModal] = useState(false);
	const [showRoomModal, setShowRoomModal] = useState(false);
	const [showTechModal, setShowTechModal] = useState(false);
	const [showRawDataModal, setShowRawDataModal] = useState(false);
	const [editingItem, setEditingItem] = useState<any>(null);
	const [rawDataItem, setRawDataItem] = useState<any>(null); // Item to show raw data for
	const [isNewRoom, setIsNewRoom] = useState(false); // Track if we're creating a new room

	// Form states
	const [roomForm, setRoomForm] = useState<Partial<RoomTemplate>>({});
	const [techForm, setTechForm] = useState<Partial<TechnologyTemplate>>({});
	const [roomTechnology, setRoomTechnology] = useState<RoomTechnology[]>([]);
	const [availableTechnologies, setAvailableTechnologies] = useState<TechnologyTemplate[]>([]);
	const [selectedTechForAdd, setSelectedTechForAdd] = useState<any[]>([]);

	// Fuse.js instances - only create when data exists
	const userFuse = useMemo(() => {
		if (users.length === 0) return null;
		return new Fuse(users, {
			keys: ['name', 'email'],
			threshold: 0.3,
		});
	}, [users]);

	const roomFuse = useMemo(() => {
		if (rooms.length === 0) return null;
		return new Fuse(rooms, {
			keys: ['id', 'name', 'type', 'layout_id'],
			threshold: 0.3,
		});
	}, [rooms]);

	const techFuse = useMemo(() => {
		if (technologies.length === 0) return null;
		return new Fuse(technologies, {
			keys: ['id', 'name', 'category', 'description'],
			threshold: 0.3,
		});
	}, [technologies]);

	// Filtered data based on search - always return arrays
	const filteredUsers = useMemo(() => {
		if (!userSearch.trim()) return users;
		if (!userFuse) return users;
		return userFuse.search(userSearch).map(result => result.item);
	}, [users, userSearch, userFuse]);

	const floors = useMemo(() => {
		const maxFloor = rooms.reduce((max, r) => Math.max(max, r.floor), 0);
		return Array.from({ length: maxFloor + 2 }, (_, i) => i);
	}, [rooms]);

	const roomTypes = useMemo(() => {
		const types = Array.from(new Set(rooms.map(r => r.type)));
		if (!types.includes('elevator')) types.push('elevator');
		return types;
	}, [rooms]);

	const filteredRooms = useMemo(() => {
		const result = rooms.filter(r => r.floor === selectedFloor);
		if (!roomSearch.trim()) return result;
		if (!roomFuse) return result;
		return roomFuse.search(roomSearch).map(result => result.item).filter(r => r.floor === selectedFloor);
	}, [rooms, roomSearch, roomFuse, selectedFloor]);

	const filteredTechnologies = useMemo(() => {
		if (!techSearch.trim()) return technologies;
		if (!techFuse) return technologies;
		return techFuse.search(techSearch).map(result => result.item);
	}, [technologies, techSearch, techFuse]);

	useEffect(() => {
		// Check if user is admin
		const checkAdminAccess = async () => {
			const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

			// Validate/refresh session to get latest admin status
			const validSession = await validateOrRefreshSession(API_URL);

			if (!validSession?.user?.is_admin) {
				toast.error('Admin access required');
				navigate('/');
				return;
			}

			loadData();
		};

		checkAdminAccess();
	}, [navigate]);

	const loadData = async (clearCache = false) => {
		try {
			setLoading(true);
			setError(null);

			// Clear cache if requested to ensure fresh data
			if (clearCache) {
				apiService.clearCache();
			}

			const [usersData, roomsData, techData] = await Promise.all([
				adminService.getUsers(),
				apiService.getAllRoomTemplates(),
				apiService.getAllTechnologyTemplates(),
			]);

			setUsers(usersData);
			setRooms(roomsData);
			setTechnologies(techData);
			setAvailableTechnologies(techData); // Store for dropdown
		} catch (err: any) {
			setError(err.message || 'Failed to load admin data');
			toast.error(err.message || 'Failed to load admin data');
		} finally {
			setLoading(false);
		}
	};

	const handleUserAdminToggle = async (userId: string, isAdmin: boolean) => {
		try {
			await adminService.updateUserAdmin(userId, isAdmin);
			toast.success('User admin status updated');
			loadData(true); // Clear cache to fetch fresh user data
		} catch (err: any) {
			toast.error(err.message || 'Failed to update user');
		}
	};

	const loadRoomTechnology = async (roomId: string) => {
		try {
			const roomTech = await apiService.getTechnologyForRoom(roomId);
			setRoomTechnology(roomTech);
		} catch (err: any) {
			console.warn('Failed to load room technology:', err);
			setRoomTechnology([]); // Clear on error
		}
		// Clear any selected technology for add when loading room technology
		setSelectedTechForAdd([]);
	};

	const handleCreateRoom = () => {
		const gateRoom = rooms.find(r => r.type === 'gate_room');
		if (gateRoom) {
			return handleEditRoom(gateRoom);
		}
		setEditingItem(null);
		setIsNewRoom(false);
		setRoomForm({
			layout_id: 'destiny',
			type: 'corridor',
			name: '',
			description: '',
			width: 1,
			height: 1,
			floor: selectedFloor,
			found: false,
			locked: false,
			explored: false,
			base_exploration_time: 2,
			status: 'ok',
		});
		setRoomTechnology([]); // Clear technology for new rooms
		setSelectedTechForAdd([]); // Clear selected technology for add
		setShowRoomModal(true);
	};

	const handleEditRoom = (room: RoomTemplate) => {
		setEditingItem(room);
		setIsNewRoom(false);
		setRoomForm(room);
		loadRoomTechnology(room.id);
		setShowRoomModal(true);
	};

	const handleSwitchToRoom = (room: RoomTemplate) => {
		setEditingItem(room);
		setIsNewRoom(false); // Switching to an existing room
		setRoomForm(room);
		loadRoomTechnology(room.id);
		// Keep the modal open, just switch to editing the new room
	};

	const handleAddConnectingRoom = (direction: 'north' | 'south' | 'east' | 'west') => {
		if (!editingItem) return;

		// Generate a new room ID based on the current room and direction
		const newRoomId = `${editingItem.id}_${direction}`;

		// Create a new room template with reverse connection
		const reverseDirection = {
			north: 'south',
			south: 'north',
			east: 'west',
			west: 'east',
		} as const;

		const newRoom: RoomTemplate = {
			id: newRoomId,
			name: `New Room (${direction})`,
			description: `Connected room ${direction} of ${editingItem.name}`,
			layout_id: editingItem.layout_id,
			type: 'basic',
			width: editingItem.width,
			height: editingItem.height,
			floor: editingItem.floor,
			found: false,
			locked: false,
			explored: false,
			image: null,
			connection_north: null,
			connection_south: null,
			connection_east: null,
			connection_west: null,
			[`connection_${reverseDirection[direction]}`]: editingItem.id,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		// Add the new room to the local state (bidirectional connection will be handled by backend)
		setRooms(prevRooms => [...prevRooms, newRoom]);

		// Switch to editing the new room
		setEditingItem(newRoom);
		setIsNewRoom(true); // This is a new room, allow ID editing
		setRoomForm(newRoom);
	};

	const handleSaveRoom = async () => {
		try {
			if (!roomForm.id || !roomForm.name) {
				toast.error('Room ID and name are required');
				return;
			}

			if (isNewRoom) {
				// Creating a new room (including connecting rooms)
				await adminService.createRoom(roomForm);
				toast.success('Room created successfully');
			} else {
				// Updating an existing room
				await adminService.updateRoom(editingItem.id, roomForm);
				toast.success('Room updated successfully');
			}

			// Save room technology changes
			if (roomTechnology.length > 0 || editingItem?.id) {
				// Prepare technology data without timestamps (backend will set them)
				const techData = roomTechnology.map(tech => ({
					id: tech.id,
					room_id: roomForm.id,
					technology_template_id: tech.technology_template_id,
					count: tech.count,
					description: tech.description,
				}));

				await adminService.setRoomTechnology(roomForm.id!, techData);
			}

			// setShowRoomModal(false);
			setIsNewRoom(false); // Reset state
			loadData(true); // Clear cache to fetch fresh room data
		} catch (err: any) {
			toast.error(err.message || 'Failed to save room');
		}
	};

	const handleDeleteRoom = async (roomId: string) => {
		if (!confirm('Are you sure you want to delete this room? This will also delete all associated technology.')) return;

		try {
			// Room deletion on backend will cascade delete room technology via room_id reference
			await adminService.deleteRoom(roomId);
			toast.success('Room deleted successfully');
			loadData(true); // Clear cache to fetch fresh room data
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete room');
		}
	};

	const handleCreateTechnology = () => {
		setEditingItem(null);
		setTechForm({
			name: '',
			description: '',
			category: '',
			cost: 0,
		});
		setShowTechModal(true);
	};

	const handleEditTechnology = (tech: TechnologyTemplate) => {
		setEditingItem(tech);
		setTechForm(tech);
		setShowTechModal(true);
	};

	const handleSaveTechnology = async () => {
		try {
			if (!techForm.id || !techForm.name || !techForm.description) {
				toast.error('Technology ID, name, and description are required');
				return;
			}

			if (editingItem) {
				await adminService.updateTechnology(editingItem.id, techForm);
				toast.success('Technology updated successfully');
			} else {
				await adminService.createTechnology(techForm);
				toast.success('Technology created successfully');
			}

			setShowTechModal(false);
			loadData(true); // Clear cache to fetch fresh technology data
		} catch (err: any) {
			toast.error(err.message || 'Failed to save technology');
		}
	};

	const handleDeleteTechnology = async (techId: string) => {
		if (!confirm('Are you sure you want to delete this technology?')) return;

		try {
			await adminService.deleteTechnology(techId);
			toast.success('Technology deleted successfully');
			loadData(true); // Clear cache to fetch fresh technology data
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete technology');
		}
	};

	const handleViewRawData = (item: any) => {
		setRawDataItem(item);
		setShowRawDataModal(true);
	};

	if (loading) {
		return (
			<div className="container-fluid d-flex align-items-center justify-content-center bg-dark text-light" style={{ minHeight: '100vh' }}>
				<div className="text-center">
					<div className="spinner-border text-primary" role="status">
						<span className="visually-hidden">Loading...</span>
					</div>
					<p className="mt-2">Loading admin panel...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-dark text-light" style={{ minHeight: '100vh' }}>
			<div className="container py-4">
				<div className="d-flex justify-content-between align-items-center mb-4">
					<h1>Admin Panel</h1>
					<Button variant="secondary" onClick={() => navigate('/')}>
						<FaArrowLeft /> Back to Menu
					</Button>
				</div>

				{error && (
					<Alert variant="danger" className="mb-4">
						{error}
					</Alert>
				)}

				<Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'users')}>
					<Nav variant="tabs" className="mb-4">
						<Nav.Item>
							<Nav.Link eventKey="users">Users</Nav.Link>
						</Nav.Item>
						<Nav.Item>
							<Nav.Link eventKey="rooms">Room Templates</Nav.Link>
						</Nav.Item>
						<Nav.Item>
							<Nav.Link eventKey="technologies">Technology Templates</Nav.Link>
						</Nav.Item>
					</Nav>

					<Tab.Content>
						{/* Users Tab */}
						<Tab.Pane eventKey="users">
							<Card bg="dark" text="light">
								<Card.Header>
									<h4>User Management</h4>
								</Card.Header>
								<Card.Body>
									<InputGroup className="mb-3">
										<InputGroup.Text>
											<FaSearch />
										</InputGroup.Text>
										<Form.Control
											type="text"
											value={userSearch}
											onChange={(e) => setUserSearch(e.target.value)}
											placeholder="Search users by name or email"
										/>
									</InputGroup>
									<div style={{ maxHeight: '600px', overflowY: 'auto' }}>
										<Table striped bordered hover variant="dark">
											<thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
												<tr>
													<th>Name</th>
													<th>Email</th>
													<th>Admin</th>
													<th>Created</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{filteredUsers?.map((user) => (
													<tr key={user.id}>
														<td>{user.name}</td>
														<td>{user.email}</td>
														<td>
															<Form.Check
																type="switch"
																checked={user.is_admin}
																onChange={(e) => handleUserAdminToggle(user.id, e.target.checked)}
															/>
														</td>
														<td>{new Date(user.created_at).toLocaleDateString()}</td>
														<td>
															<small className="text-muted">ID: {user.id}</small>
														</td>
													</tr>
												))}
											</tbody>
										</Table>
									</div>
									{filteredUsers?.length === 0 && userSearch && (
										<div className="text-center text-muted py-3">
											No users found matching &ldquo;{userSearch}&rdquo;
										</div>
									)}
								</Card.Body>
							</Card>
						</Tab.Pane>

						{/* Rooms Tab */}
						<Tab.Pane eventKey="rooms">
							<Card bg="dark" text="light">
								<Card.Header className="d-flex justify-content-between align-items-center">
									<h4>Room Templates</h4>
									<div className="d-flex align-items-center">
										<Form.Select
											className="me-2"
											style={{ width: '120px' }}
											value={selectedFloor}
											onChange={(e) => setSelectedFloor(parseInt(e.target.value))}
										>
											{floors.map((f) => (
												<option key={f} value={f}>Floor {f}</option>
											))}
										</Form.Select>
										<Button variant="primary" onClick={handleCreateRoom}>
											<FaPlus /> Add Room
										</Button>
									</div>
								</Card.Header>
								<Card.Body>
									<InputGroup className="mb-3">
										<InputGroup.Text>
											<FaSearch />
										</InputGroup.Text>
										<Form.Control
											type="text"
											value={roomSearch}
											onChange={(e) => setRoomSearch(e.target.value)}
											placeholder="Search rooms by ID, name, type, or layout"
										/>
									</InputGroup>
									<div style={{ maxHeight: '600px', overflowY: 'auto' }}>
										<Table striped bordered hover variant="dark">
											<thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
												<tr>
													<th>ID</th>
													<th>Name</th>
													<th>Type</th>
													<th>Layout</th>
													<th>Size</th>
													<th>Floor</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{filteredRooms.map((room) => (
													<tr key={room.id}>
														<td><code>{room.id}</code></td>
														<td>{room.name}</td>
														<td>{room.type}</td>
														<td>{room.layout_id}</td>
														<td>{room.width}x{room.height}</td>
														<td>{room.floor}</td>
														<td>
															<Button
																size="sm"
																variant="outline-info"
																className="me-2"
																onClick={() => handleViewRawData(room)}
																title="View Raw Data"
															>
																<FaEye />
															</Button>
															<Button
																size="sm"
																variant="outline-warning"
																className="me-2"
																onClick={() => handleEditRoom(room)}
															>
																<FaEdit />
															</Button>
															<Button
																size="sm"
																variant="outline-danger"
																onClick={() => handleDeleteRoom(room.id)}
															>
																<FaTrash />
															</Button>
														</td>
													</tr>
												))}
											</tbody>
										</Table>
									</div>
									{filteredRooms.length === 0 && roomSearch && (
										<div className="text-center text-muted py-3">
											No rooms found matching &ldquo;{roomSearch}&rdquo;
										</div>
									)}
								</Card.Body>
							</Card>
						</Tab.Pane>

						{/* Technologies Tab */}
						<Tab.Pane eventKey="technologies">
							<Card bg="dark" text="light">
								<Card.Header className="d-flex justify-content-between align-items-center">
									<h4>Technology Templates</h4>
									<Button variant="primary" onClick={handleCreateTechnology}>
										<FaPlus /> Add Technology
									</Button>
								</Card.Header>
								<Card.Body>
									<InputGroup className="mb-3">
										<InputGroup.Text>
											<FaSearch />
										</InputGroup.Text>
										<Form.Control
											type="text"
											value={techSearch}
											onChange={(e) => setTechSearch(e.target.value)}
											placeholder="Search technologies by ID, name, category, or description"
										/>
									</InputGroup>
									<div style={{ maxHeight: '600px', overflowY: 'auto' }}>
										<Table striped bordered hover variant="dark">
											<thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
												<tr>
													<th>ID</th>
													<th>Name</th>
													<th>Category</th>
													<th>Cost</th>
													<th>Description</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{filteredTechnologies.map((tech) => (
													<tr key={tech.id}>
														<td><code>{tech.id}</code></td>
														<td>{tech.name}</td>
														<td>{tech.category || 'N/A'}</td>
														<td>{tech.cost}</td>
														<td>{tech.description.substring(0, 50)}...</td>
														<td>
															<Button
																size="sm"
																variant="outline-info"
																className="me-2"
																onClick={() => handleViewRawData(tech)}
																title="View Raw Data"
															>
																<FaEye />
															</Button>
															<Button
																size="sm"
																variant="outline-warning"
																className="me-2"
																onClick={() => handleEditTechnology(tech)}
															>
																<FaEdit />
															</Button>
															<Button
																size="sm"
																variant="outline-danger"
																onClick={() => handleDeleteTechnology(tech.id)}
															>
																<FaTrash />
															</Button>
														</td>
													</tr>
												))}
											</tbody>
										</Table>
									</div>
									{filteredTechnologies.length === 0 && techSearch && (
										<div className="text-center text-muted py-3">
											No technologies found matching &ldquo;{techSearch}&rdquo;
										</div>
									)}
								</Card.Body>
							</Card>
						</Tab.Pane>
					</Tab.Content>
				</Tab.Container>

				{/* Room Modal */}
				<Modal
					show={showRoomModal}
					onHide={() => {
						setShowRoomModal(false);
						setIsNewRoom(false); // Reset state when closing modal
					}}
					fullscreen={true}
				>
					<Modal.Header closeButton>
						<Modal.Title>{isNewRoom ? 'Create Room' : 'Edit Room'}</Modal.Title>
					</Modal.Header>
					<Modal.Body className="p-0" style={{ height: 'calc(100vh - 120px)' }}>
						<div className="d-flex h-100">
							{/* Left Side - Edit Form */}
							<div className="flex-shrink-0 p-4" style={{ width: '400px', overflowY: 'auto' }}>
								<Form>
									<Form.Group className="mb-3">
										<Form.Label>Room ID</Form.Label>
										<Form.Control
											type="text"
											value={roomForm.id || ''}
											onChange={(e) => setRoomForm({ ...roomForm, id: e.target.value })}
											disabled={!isNewRoom}
										/>
										<Form.Text className="text-muted">
											{isNewRoom ? 'Enter a unique room ID' : 'Room ID cannot be changed for existing rooms'}
										</Form.Text>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Name</Form.Label>
										<Form.Control
											type="text"
											value={roomForm.name || ''}
											onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
										/>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Description</Form.Label>
										<Form.Control
											as="textarea"
											rows={3}
											value={roomForm.description || ''}
											onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
										/>
									</Form.Group>
									<div className="row">
										<div className="col-md-6">
											<Form.Group className="mb-3">
												<Form.Label>Layout ID</Form.Label>
												<Form.Select
													value={roomForm.layout_id || ''}
													onChange={(e) => setRoomForm({ ...roomForm, layout_id: e.target.value })}
												>
													<option value="destiny">Destiny</option>
													<option value="atlantis">Atlantis</option>
												</Form.Select>
											</Form.Group>
										</div>
										<div className="col-md-6">
											<Form.Group className="mb-3">
												<Form.Label>Type</Form.Label>
												<Form.Select
													value={roomForm.type || 'basic'}
													onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
												>
													{roomTypes.map(type => (
														<option key={type} value={type}>{type}</option>
													))}
												</Form.Select>
											</Form.Group>
										</div>
									</div>
									<div className="row">
										<div className="col-md-6">
											<Form.Group className="mb-3">
												<Form.Label>Status</Form.Label>
												<Form.Select
													value={roomForm.status || 'ok'}
													onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
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
													value={roomForm.base_exploration_time || 2}
													onChange={(e) => setRoomForm({ ...roomForm, base_exploration_time: parseInt(e.target.value) })}
												/>
											</Form.Group>
										</div>
									</div>
									<div className="row">
										<div className="col-md-4">
											<Form.Group className="mb-3">
												<Form.Label>Width</Form.Label>
												<Form.Control
													type="number"
													value={roomForm.width || 1}
													onChange={(e) => setRoomForm({ ...roomForm, width: parseInt(e.target.value) })}
												/>
											</Form.Group>
										</div>
										<div className="col-md-4">
											<Form.Group className="mb-3">
												<Form.Label>Height</Form.Label>
												<Form.Control
													type="number"
													value={roomForm.height || 1}
													onChange={(e) => setRoomForm({ ...roomForm, height: parseInt(e.target.value) })}
												/>
											</Form.Group>
										</div>
										<div className="col-md-4">
											<Form.Group className="mb-3">
												<Form.Label>Floor</Form.Label>
												<Form.Select
													value={roomForm.floor ?? selectedFloor}
													onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) })}
												>
													{floors.map(f => (
														<option key={f} value={f}>Floor {f}</option>
													))}
												</Form.Select>
											</Form.Group>
										</div>
									</div>

									{/* Boolean flags */}
									<div className="row">
										<div className="col-md-4">
											<Form.Check
												type="checkbox"
												label="Found"
												checked={roomForm.found || false}
												onChange={(e) => setRoomForm({ ...roomForm, found: e.target.checked })}
											/>
										</div>
										<div className="col-md-4">
											<Form.Check
												type="checkbox"
												label="Locked"
												checked={roomForm.locked || false}
												onChange={(e) => setRoomForm({ ...roomForm, locked: e.target.checked })}
											/>
										</div>
										<div className="col-md-4">
											<Form.Check
												type="checkbox"
												label="Explored"
												checked={roomForm.explored || false}
												onChange={(e) => setRoomForm({ ...roomForm, explored: e.target.checked })}
											/>
										</div>
									</div>

									{/* Technology Section */}
									<hr className="my-4" />
									<h5>Room Technology</h5>
									{roomTechnology.length > 0 ? (
										<div>
											{roomTechnology.map((tech, index) => {
												const techTemplate = availableTechnologies.find(t => t.id === tech.technology_template_id);
												return (
													<Card key={index} className="mb-2">
														<Card.Body className="py-2">
															<div className="d-flex justify-content-between align-items-center">
																<div className="flex-grow-1">
																	<strong>{techTemplate?.name || tech.technology_template_id}</strong>
																	<div className="small text-muted mt-1">
																		{truncateWithTooltip(tech.description || techTemplate?.description || 'No description')}
																	</div>
																</div>
																<div className="d-flex align-items-center">
																	<Form.Label className="me-2 mb-0 small">Count:</Form.Label>
																	<Form.Control
																		type="number"
																		min="1"
																		value={tech.count}
																		onChange={(e) => {
																			const newCount = parseInt(e.target.value) || 1;
																			setRoomTechnology(prev =>
																				prev.map((t, i) => i === index ? { ...t, count: newCount } : t),
																			);
																		}}
																		style={{ width: '80px' }}
																		size="sm"
																		className="me-2"
																	/>
																	<Button
																		size="sm"
																		variant="outline-danger"
																		onClick={() => {
																			setRoomTechnology(prev => prev.filter((_, i) => i !== index));
																		}}
																	>
																		Remove
																	</Button>
																</div>
															</div>
														</Card.Body>
													</Card>
												);
											})}
										</div>
									) : (
										<Alert variant="info">No technology found in this room.</Alert>
									)}

									{/* Add technology form */}
									<Card className="mt-3">
										<Card.Header>Add Technology</Card.Header>
										<Card.Body>
											<div className="row">
												<div className="col">
													<Typeahead
														id="technology-selector"
														options={availableTechnologies}
														labelKey="name"
														placeholder="Search and select technology to add..."
														selected={selectedTechForAdd}
														onChange={(selected: any[]) => {
															if (selected.length > 0) {
																const selectedTech = selected[0] as TechnologyTemplate;

																// Check if technology is already added
																const existingTech = roomTechnology.find(t => t.technology_template_id === selectedTech.id);
																if (existingTech) {
																	toast.warning(`${selectedTech.name} is already added to this room`);
																	setSelectedTechForAdd([]);
																	return;
																}

																const newTech: RoomTechnology = {
																	id: `${roomForm.id}_${selectedTech.id}_${Date.now()}`,
																	room_id: roomForm.id || '',
																	technology_template_id: selectedTech.id,
																	count: 1,
																	description: selectedTech.description,
																	created_at: Date.now(),
																	updated_at: Date.now(),
																};
																setRoomTechnology(prev => [...prev, newTech]);
																setSelectedTechForAdd([]); // Clear selection
															}
														}}
														filterBy={['name', 'category', 'description']}
														renderMenuItemChildren={(tech: any) => (
															<div>
																<div><strong>{tech.name}</strong></div>
																<div className="text-muted small">
																	{tech.category && <span className="badge bg-secondary me-2">{tech.category}</span>}
																	{tech.description}
																</div>
															</div>
														)}
														clearButton
														highlightOnlyResult
													/>
												</div>
											</div>
										</Card.Body>
									</Card>
								</Form>
							</div>

							{/* Right Side - Room Visualization */}
							<div className="flex-grow-1" style={{ backgroundColor: '#000' }}>
								{editingItem ? (
									<RoomEditVisualization
										room={editingItem}
										allRooms={rooms}
										onRoomClick={handleSwitchToRoom}
										onAddConnectingRoom={handleAddConnectingRoom}
									/>
								) : (
									<div className="d-flex align-items-center justify-content-center h-100 text-muted">
										<div className="text-center">
											<h5>Room Visualization</h5>
											<p>Visualization will appear here when editing an existing room.</p>
										</div>
									</div>
								)}
							</div>
						</div>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={() => {
							setShowRoomModal(false);
							setIsNewRoom(false); // Reset state when canceling
						}}>
							Cancel
						</Button>
						<Button variant="primary" onClick={handleSaveRoom}>
							{isNewRoom ? 'Create' : 'Update'}
						</Button>
					</Modal.Footer>
				</Modal>

				{/* Technology Modal */}
				<Modal show={showTechModal} onHide={() => setShowTechModal(false)} size="lg">
					<Modal.Header closeButton>
						<Modal.Title>{editingItem ? 'Edit Technology' : 'Create Technology'}</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<Form>
							<Form.Group className="mb-3">
								<Form.Label>Technology ID</Form.Label>
								<Form.Control
									type="text"
									value={techForm.id || ''}
									onChange={(e) => setTechForm({ ...techForm, id: e.target.value })}
									disabled={!!editingItem}
								/>
							</Form.Group>
							<Form.Group className="mb-3">
								<Form.Label>Name</Form.Label>
								<Form.Control
									type="text"
									value={techForm.name || ''}
									onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
								/>
							</Form.Group>
							<Form.Group className="mb-3">
								<Form.Label>Description</Form.Label>
								<Form.Control
									as="textarea"
									rows={3}
									value={techForm.description || ''}
									onChange={(e) => setTechForm({ ...techForm, description: e.target.value })}
								/>
							</Form.Group>
							<div className="row">
								<div className="col-md-6">
									<Form.Group className="mb-3">
										<Form.Label>Category</Form.Label>
										<Form.Control
											type="text"
											value={techForm.category || ''}
											onChange={(e) => setTechForm({ ...techForm, category: e.target.value })}
										/>
									</Form.Group>
								</div>
								<div className="col-md-6">
									<Form.Group className="mb-3">
										<Form.Label>Cost</Form.Label>
										<Form.Control
											type="number"
											value={techForm.cost || 0}
											onChange={(e) => setTechForm({ ...techForm, cost: parseInt(e.target.value) })}
										/>
									</Form.Group>
								</div>
							</div>
							<Form.Group className="mb-3">
								<Form.Label>Image</Form.Label>
								<Form.Control
									type="text"
									value={techForm.image || ''}
									onChange={(e) => setTechForm({ ...techForm, image: e.target.value })}
									placeholder="image.png"
								/>
							</Form.Group>
						</Form>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={() => setShowTechModal(false)}>
							Cancel
						</Button>
						<Button variant="primary" onClick={handleSaveTechnology}>
							{editingItem ? 'Update' : 'Create'}
						</Button>
					</Modal.Footer>
				</Modal>

				{/* Raw Data Modal */}
				<Modal show={showRawDataModal} onHide={() => setShowRawDataModal(false)} size="lg">
					<Modal.Header closeButton>
						<Modal.Title>Raw Data - {rawDataItem?.id || rawDataItem?.name || 'Item'}</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<pre style={{
							backgroundColor: '#1e1e1e',
							color: '#d4d4d4',
							padding: '1rem',
							borderRadius: '4px',
							overflow: 'auto',
							maxHeight: '60vh',
							fontSize: '0.875rem',
							lineHeight: '1.4',
						}}>
							<code>
								{rawDataItem ? JSON.stringify(rawDataItem, null, 2) : 'No data'}
							</code>
						</pre>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={() => setShowRawDataModal(false)}>
							Close
						</Button>
						<Button
							variant="primary"
							onClick={() => {
								if (rawDataItem) {
									navigator.clipboard.writeText(JSON.stringify(rawDataItem, null, 2));
									toast.success('JSON data copied to clipboard');
								}
							}}
						>
							Copy to Clipboard
						</Button>
					</Modal.Footer>
				</Modal>
			</div>
		</div>
	);
};
