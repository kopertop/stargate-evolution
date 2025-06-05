import { RoomTemplate, TechnologyTemplate } from '@stargate/common';
import Fuse from 'fuse.js';
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Nav, Tab, Table, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaArrowLeft, FaSearch } from 'react-icons/fa';
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

	// Modal states
	const [showUserModal, setShowUserModal] = useState(false);
	const [showRoomModal, setShowRoomModal] = useState(false);
	const [showTechModal, setShowTechModal] = useState(false);
	const [editingItem, setEditingItem] = useState<any>(null);

	// Form states
	const [roomForm, setRoomForm] = useState<Partial<RoomTemplate>>({});
	const [techForm, setTechForm] = useState<Partial<TechnologyTemplate>>({});

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

	const filteredRooms = useMemo(() => {
		if (!roomSearch.trim()) return rooms;
		if (!roomFuse) return rooms;
		return roomFuse.search(roomSearch).map(result => result.item);
	}, [rooms, roomSearch, roomFuse]);

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

	const loadData = async () => {
		try {
			setLoading(true);
			setError(null);

			const [usersData, roomsData, techData] = await Promise.all([
				adminService.getUsers(),
				apiService.getAllRoomTemplates(),
				apiService.getAllTechnologyTemplates(),
			]);

			setUsers(usersData);
			setRooms(roomsData);
			setTechnologies(techData);
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
			loadData(); // Reload to get fresh data
		} catch (err: any) {
			toast.error(err.message || 'Failed to update user');
		}
	};

	const handleCreateRoom = () => {
		setEditingItem(null);
		setRoomForm({
			layout_id: 'destiny',
			type: 'corridor',
			name: '',
			description: '',
			width: 1,
			height: 1,
			floor: 0,
			found: false,
			locked: false,
			explored: false,
			base_exploration_time: 2,
			status: 'ok',
		});
		setShowRoomModal(true);
	};

	const handleEditRoom = (room: RoomTemplate) => {
		setEditingItem(room);
		setRoomForm(room);
		setShowRoomModal(true);
	};

	const handleSwitchToRoom = (room: RoomTemplate) => {
		setEditingItem(room);
		setRoomForm(room);
		// Keep the modal open, just switch to editing the new room
	};



	const handleSaveRoom = async () => {
		try {
			if (!roomForm.id || !roomForm.name) {
				toast.error('Room ID and name are required');
				return;
			}

			if (editingItem) {
				await adminService.updateRoom(editingItem.id, roomForm);
				toast.success('Room updated successfully');
			} else {
				await adminService.createRoom(roomForm);
				toast.success('Room created successfully');
			}

			setShowRoomModal(false);
			loadData();
		} catch (err: any) {
			toast.error(err.message || 'Failed to save room');
		}
	};

	const handleDeleteRoom = async (roomId: string) => {
		if (!confirm('Are you sure you want to delete this room?')) return;

		try {
			await adminService.deleteRoom(roomId);
			toast.success('Room deleted successfully');
			loadData();
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
			loadData();
		} catch (err: any) {
			toast.error(err.message || 'Failed to save technology');
		}
	};

	const handleDeleteTechnology = async (techId: string) => {
		if (!confirm('Are you sure you want to delete this technology?')) return;

		try {
			await adminService.deleteTechnology(techId);
			toast.success('Technology deleted successfully');
			loadData();
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete technology');
		}
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
									<Button variant="primary" onClick={handleCreateRoom}>
										<FaPlus /> Add Room
									</Button>
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
					onHide={() => setShowRoomModal(false)}
					fullscreen={true}
				>
					<Modal.Header closeButton>
						<Modal.Title>{editingItem ? 'Edit Room' : 'Create Room'}</Modal.Title>
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
											disabled={!!editingItem}
										/>
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
												<Form.Control
													type="text"
													value={roomForm.type || ''}
													onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
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
												<Form.Control
													type="number"
													min="0"
													value={roomForm.floor || 0}
													onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) })}
												/>
											</Form.Group>
										</div>
									</div>
								</Form>
							</div>

							{/* Right Side - Room Visualization */}
							<div className="flex-grow-1" style={{ backgroundColor: '#000' }}>
								{editingItem ? (
									<RoomEditVisualization
										room={editingItem}
										allRooms={rooms}
										onRoomClick={handleSwitchToRoom}
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
						<Button variant="secondary" onClick={() => setShowRoomModal(false)}>
							Cancel
						</Button>
						<Button variant="primary" onClick={handleSaveRoom}>
							{editingItem ? 'Update' : 'Create'}
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
			</div>
		</div>
	);
};
