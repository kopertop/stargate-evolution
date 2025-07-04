import type { DoorTemplate } from '@stargate/common';
import React, { useState, useEffect } from 'react';
import { Alert, Button, Card, Form, Modal, Table, Badge, ButtonGroup } from 'react-bootstrap';
import { FaDoorOpen, FaLock, FaUnlock, FaCheck, FaTimes, FaCog, FaFilter } from 'react-icons/fa';

import { AdminService } from '../../services/admin-service';

interface DoorRestrictionModalProps {
	show: boolean;
	onHide: () => void;
	door: DoorTemplate | null;
	onSave: (doorId: string, updates: Partial<DoorTemplate>) => void;
}

const DoorRestrictionModal: React.FC<DoorRestrictionModalProps> = ({ show, onHide, door, onSave }) => {
	const [cleared, setCleared] = useState(false);
	const [restricted, setRestricted] = useState(false);

	useEffect(() => {
		if (door) {
			setCleared(door.cleared || false);
			setRestricted(door.restricted || false);
		}
	}, [door]);

	const handleSave = () => {
		if (door) {
			onSave(door.id, { cleared, restricted });
			onHide();
		}
	};

	return (
		<Modal show={show} onHide={onHide} centered>
			<Modal.Header closeButton>
				<Modal.Title>
					<FaCog className="me-2" />
					Door Access Control
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{door && (
					<>
						<div className="mb-3">
							<h6>Door: {door.name || door.id}</h6>
							<small className="text-muted">
								From: {door.from_room_id} → To: {door.to_room_id}
							</small>
						</div>
						
						<Form>
							<Form.Group className="mb-3">
								<Form.Check
									type="checkbox"
									id="cleared-checkbox"
									label="Cleared by User"
									checked={cleared}
									onChange={(e) => setCleared(e.target.checked)}
								/>
								<Form.Text className="text-muted">
									Mark this door as having been opened by the user. NPCs can only access cleared doors.
								</Form.Text>
							</Form.Group>

							<Form.Group className="mb-3">
								<Form.Check
									type="checkbox"
									id="restricted-checkbox"
									label="Restricted Access"
									checked={restricted}
									onChange={(e) => setRestricted(e.target.checked)}
								/>
								<Form.Text className="text-muted">
									When restricted, only the user can open this door. NPCs will be blocked even if the door is cleared.
								</Form.Text>
							</Form.Group>
						</Form>
					</>
				)}
			</Modal.Body>
			<Modal.Footer>
				<Button variant="secondary" onClick={onHide}>
					Cancel
				</Button>
				<Button variant="primary" onClick={handleSave}>
					Save Changes
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export const AdminRooms: React.FC = () => {
	const [doors, setDoors] = useState<DoorTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedDoor, setSelectedDoor] = useState<DoorTemplate | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [filterStatus, setFilterStatus] = useState<'all' | 'cleared' | 'restricted' | 'neither'>('all');

	const adminService = new AdminService();

	useEffect(() => {
		loadDoors();
	}, []);

	const loadDoors = async () => {
		try {
			setLoading(true);
			const doorData = await adminService.getAllDoors();
			setDoors(doorData);
			setError(null);
		} catch (err) {
			console.error('Failed to load doors:', err);
			setError(err instanceof Error ? err.message : 'Failed to load doors');
		} finally {
			setLoading(false);
		}
	};

	const handleEditDoor = (door: DoorTemplate) => {
		setSelectedDoor(door);
		setShowModal(true);
	};

	const handleSaveDoor = async (doorId: string, updates: Partial<DoorTemplate>) => {
		try {
			await adminService.updateDoor(doorId, updates);
			await loadDoors(); // Reload doors to get fresh data
		} catch (err) {
			console.error('Failed to update door:', err);
			setError(err instanceof Error ? err.message : 'Failed to update door');
		}
	};

	const handleBulkUpdate = async (field: 'cleared' | 'restricted', value: boolean) => {
		try {
			const filteredDoors = getFilteredDoors();
			for (const door of filteredDoors) {
				await adminService.updateDoor(door.id, { [field]: value });
			}
			await loadDoors();
		} catch (err) {
			console.error('Failed to bulk update doors:', err);
			setError(err instanceof Error ? err.message : 'Failed to bulk update doors');
		}
	};

	const getFilteredDoors = () => {
		return doors.filter(door => {
			switch (filterStatus) {
			case 'cleared':
				return door.cleared;
			case 'restricted':
				return door.restricted;
			case 'neither':
				return !door.cleared && !door.restricted;
			default:
				return true;
			}
		});
	};

	const getDoorStatusBadge = (door: DoorTemplate) => {
		const badges = [];
		if (door.cleared) {
			badges.push(<Badge key="cleared" bg="success" className="me-1"><FaCheck className="me-1" />Cleared</Badge>);
		}
		if (door.restricted) {
			badges.push(<Badge key="restricted" bg="warning" className="me-1"><FaLock className="me-1" />Restricted</Badge>);
		}
		if (!door.cleared && !door.restricted) {
			badges.push(<Badge key="none" bg="secondary" className="me-1">No Access</Badge>);
		}
		return badges;
	};

	const filteredDoors = getFilteredDoors();
	const stats = {
		total: doors.length,
		cleared: doors.filter(d => d.cleared).length,
		restricted: doors.filter(d => d.restricted).length,
		noAccess: doors.filter(d => !d.cleared && !d.restricted).length,
	};

	if (loading) {
		return (
			<div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
				<div className="spinner-border" role="status">
					<span className="visually-hidden">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h1>
					<FaDoorOpen className="me-2" />
					Door Access Control
				</h1>
				<div>
					<Button href="/admin/map" variant="outline-primary" className="me-2">
						Map Builder
					</Button>
					<Button onClick={loadDoors} variant="outline-secondary">
						Refresh
					</Button>
				</div>
			</div>

			{error && (
				<Alert variant="danger" dismissible onClose={() => setError(null)}>
					<strong>Error:</strong> {error}
				</Alert>
			)}

			{/* Statistics Cards */}
			<div className="row mb-4">
				<div className="col-md-3">
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-primary">{stats.total}</h3>
							<small className="text-muted">Total Doors</small>
						</Card.Body>
					</Card>
				</div>
				<div className="col-md-3">
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-success">{stats.cleared}</h3>
							<small className="text-muted">Cleared Doors</small>
						</Card.Body>
					</Card>
				</div>
				<div className="col-md-3">
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-warning">{stats.restricted}</h3>
							<small className="text-muted">Restricted Doors</small>
						</Card.Body>
					</Card>
				</div>
				<div className="col-md-3">
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-secondary">{stats.noAccess}</h3>
							<small className="text-muted">No NPC Access</small>
						</Card.Body>
					</Card>
				</div>
			</div>

			{/* Filter and Bulk Actions */}
			<Card className="mb-4">
				<Card.Body>
					<div className="row align-items-center">
						<div className="col-md-6">
							<div className="d-flex align-items-center">
								<FaFilter className="me-2" />
								<span className="me-2">Filter:</span>
								<ButtonGroup>
									<Button 
										size="sm" 
										variant={filterStatus === 'all' ? 'primary' : 'outline-primary'}
										onClick={() => setFilterStatus('all')}
									>
										All ({doors.length})
									</Button>
									<Button 
										size="sm" 
										variant={filterStatus === 'cleared' ? 'success' : 'outline-success'}
										onClick={() => setFilterStatus('cleared')}
									>
										Cleared ({stats.cleared})
									</Button>
									<Button 
										size="sm" 
										variant={filterStatus === 'restricted' ? 'warning' : 'outline-warning'}
										onClick={() => setFilterStatus('restricted')}
									>
										Restricted ({stats.restricted})
									</Button>
									<Button 
										size="sm" 
										variant={filterStatus === 'neither' ? 'secondary' : 'outline-secondary'}
										onClick={() => setFilterStatus('neither')}
									>
										No Access ({stats.noAccess})
									</Button>
								</ButtonGroup>
							</div>
						</div>
						<div className="col-md-6">
							<div className="d-flex justify-content-end gap-2">
								<span className="me-2">Bulk Actions:</span>
								<Button size="sm" variant="outline-success" onClick={() => handleBulkUpdate('cleared', true)}>
									<FaCheck className="me-1" />Mark Cleared
								</Button>
								<Button size="sm" variant="outline-warning" onClick={() => handleBulkUpdate('restricted', true)}>
									<FaLock className="me-1" />Mark Restricted
								</Button>
								<Button size="sm" variant="outline-secondary" onClick={() => Promise.all([
									handleBulkUpdate('cleared', false),
									handleBulkUpdate('restricted', false),
								])}>
									<FaTimes className="me-1" />Clear All
								</Button>
							</div>
						</div>
					</div>
				</Card.Body>
			</Card>

			{/* Doors Table */}
			<Card>
				<Card.Header>
					<h5 className="mb-0">Doors ({filteredDoors.length})</h5>
				</Card.Header>
				<Card.Body className="p-0">
					{filteredDoors.length === 0 ? (
						<div className="text-center p-4">
							<p className="text-muted mb-0">No doors found matching the current filter.</p>
						</div>
					) : (
						<Table striped hover responsive className="mb-0">
							<thead>
								<tr>
									<th>Door ID</th>
									<th>Name</th>
									<th>Route</th>
									<th>State</th>
									<th>NPC Access</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredDoors.map(door => (
									<tr key={door.id}>
										<td>
											<code>{door.id}</code>
										</td>
										<td>{door.name || '-'}</td>
										<td>
											<small className="text-muted">
												{door.from_room_id} → {door.to_room_id}
											</small>
										</td>
										<td>
											<Badge bg={
												door.state === 'opened' ? 'success' : 
													door.state === 'locked' ? 'danger' : 'secondary'
											}>
												{door.state}
											</Badge>
										</td>
										<td>
											{getDoorStatusBadge(door)}
										</td>
										<td>
											<Button
												size="sm"
												variant="outline-primary"
												onClick={() => handleEditDoor(door)}
											>
												<FaCog className="me-1" />Configure
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</Table>
					)}
				</Card.Body>
			</Card>

			<DoorRestrictionModal
				show={showModal}
				onHide={() => setShowModal(false)}
				door={selectedDoor}
				onSave={handleSaveDoor}
			/>
		</div>
	);
};