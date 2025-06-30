import Fuse from 'fuse.js';
import React, { useEffect, useState, useMemo } from 'react';
import { Button, Card, Table, Alert, InputGroup, Form, Badge } from 'react-bootstrap';
import { FaUsers, FaSearch, FaUserShield, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { adminService } from '../../services/admin-service';

type User = {
	id: string;
	email: string;
	name: string;
	image?: string;
	is_admin: boolean;
	created_at: number;
	updated_at: number;
};

export const AdminUsers: React.FC = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [userSearch, setUserSearch] = useState('');

	// Fuse.js search instance
	const userFuse = useMemo(() => {
		if (users.length === 0) return null;
		return new Fuse(users, {
			keys: ['name', 'email'],
			threshold: 0.3,
		});
	}, [users]);

	// Filtered users
	const filteredUsers = useMemo(() => {
		if (!userSearch.trim()) return users;
		if (!userFuse) return [];
		return userFuse.search(userSearch).map(result => result.item);
	}, [users, userSearch, userFuse]);

	useEffect(() => {
		loadUsers();
	}, []);

	const loadUsers = async () => {
		try {
			setLoading(true);
			setError(null);
			const usersData = await adminService.getUsers();
			setUsers(usersData);
		} catch (err: any) {
			setError(err.message || 'Failed to load users');
			toast.error(err.message || 'Failed to load users');
		} finally {
			setLoading(false);
		}
	};

	const handleUserAdminToggle = async (userId: string, isAdmin: boolean) => {
		try {
			await adminService.updateUserAdmin(userId, isAdmin);
			toast.success('User admin status updated');
			loadUsers(); // Reload to get fresh data
		} catch (err: any) {
			toast.error(err.message || 'Failed to update user');
		}
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString();
	};

	if (loading) {
		return (
			<div className="text-center">
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
					<FaUsers className="me-2" />
					User Management
				</h1>
			</div>

			{error && <Alert variant="danger">{error}</Alert>}

			<Card>
				<Card.Header>
					<div className="d-flex justify-content-between align-items-center">
						<h5 className="mb-0">Users ({filteredUsers.length})</h5>
						<InputGroup style={{ width: '300px' }}>
							<InputGroup.Text>
								<FaSearch />
							</InputGroup.Text>
							<Form.Control
								placeholder="Search users..."
								value={userSearch}
								onChange={(e) => setUserSearch(e.target.value)}
							/>
						</InputGroup>
					</div>
				</Card.Header>
				<Card.Body className="p-0">
					<Table striped hover responsive>
						<thead>
							<tr>
								<th>User</th>
								<th>Email</th>
								<th>Admin Status</th>
								<th>Created</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{filteredUsers.map((user) => (
								<tr key={user.id}>
									<td>
										<div className="d-flex align-items-center">
											{user.image && (
												<img 
													src={user.image} 
													alt={user.name}
													className="rounded-circle me-2"
													width="32"
													height="32"
												/>
											)}
											<div>
												<strong>{user.name}</strong>
												<div className="small text-muted">
													ID: {user.id}
												</div>
											</div>
										</div>
									</td>
									<td>{user.email}</td>
									<td>
										{user.is_admin ? (
											<Badge bg="warning">
												<FaUserShield className="me-1" />
												Admin
											</Badge>
										) : (
											<Badge bg="secondary">
												<FaUser className="me-1" />
												User
											</Badge>
										)}
									</td>
									<td>{formatDate(user.created_at)}</td>
									<td>
										<Button
											size="sm"
											variant={user.is_admin ? 'outline-secondary' : 'outline-warning'}
											onClick={() => handleUserAdminToggle(user.id, !user.is_admin)}
										>
											{user.is_admin ? 'Remove Admin' : 'Make Admin'}
										</Button>
									</td>
								</tr>
							))}
							{filteredUsers.length === 0 && (
								<tr>
									<td colSpan={5} className="text-center text-muted">
										{userSearch ? 'No users match your search' : 'No users found'}
									</td>
								</tr>
							)}
						</tbody>
					</Table>
				</Card.Body>
			</Card>
		</div>
	);
};