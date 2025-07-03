import React, { useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { FaUsers, FaRobot, FaDoorOpen, FaToolbox, FaChartLine } from 'react-icons/fa';

import { adminService } from '../../services/admin-service';
import { characterService } from '../../services/character-service';

export const AdminOverview: React.FC = () => {
	const [stats, setStats] = useState({
		users: 0,
		characters: 0,
		rooms: 0,
		technologies: 0,
		loading: true,
	});

	useEffect(() => {
		loadStats();
	}, []);

	const loadStats = async () => {
		try {
			const [users, characters, rooms, technologies] = await Promise.all([
				adminService.getUsers(),
				characterService.getAllCharacters(),
				adminService.getAllRoomTemplates(),
				adminService.getAllTechnologyTemplates(),
			]);

			setStats({
				users: users.length,
				characters: characters.length,
				rooms: rooms.length,
				technologies: technologies.length,
				loading: false,
			});
		} catch (error) {
			console.error('Failed to load admin stats:', error);
			setStats(prev => ({ ...prev, loading: false }));
		}
	};

	const statCards = [
		{
			title: 'Users',
			count: stats.users,
			icon: <FaUsers size={40} className="text-primary" />,
			description: 'Registered users',
		},
		{
			title: 'Characters',
			count: stats.characters,
			icon: <FaRobot size={40} className="text-success" />,
			description: 'Player characters',
		},
		{
			title: 'Room Templates',
			count: stats.rooms,
			icon: <FaDoorOpen size={40} className="text-info" />,
			description: 'Available room types',
		},
		{
			title: 'Technologies',
			count: stats.technologies,
			icon: <FaToolbox size={40} className="text-warning" />,
			description: 'Technology templates',
		},
	];

	return (
		<div>
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h1>
					<FaChartLine className="me-2" />
					Admin Overview
				</h1>
			</div>

			<Row>
				{statCards.map((card, index) => (
					<Col key={index} md={6} lg={3} className="mb-4">
						<Card className="h-100 text-center">
							<Card.Body>
								<div className="mb-3">{card.icon}</div>
								<Card.Title className="h2">
									{stats.loading ? '...' : card.count}
								</Card.Title>
								<Card.Subtitle className="mb-2 text-muted">
									{card.title}
								</Card.Subtitle>
								<Card.Text className="small">
									{card.description}
								</Card.Text>
							</Card.Body>
						</Card>
					</Col>
				))}
			</Row>

			<Row>
				<Col lg={6} className="mb-4">
					<Card>
						<Card.Header>
							<Card.Title className="mb-0">Quick Actions</Card.Title>
						</Card.Header>
						<Card.Body>
							<div className="d-grid gap-2">
								<a href="/admin/map" className="btn btn-primary">
									<FaDoorOpen className="me-2" />
									Open Map Builder
								</a>
								<a href="/admin/characters" className="btn btn-success">
									<FaRobot className="me-2" />
									Manage Characters
								</a>
								<a href="/admin/users" className="btn btn-info">
									<FaUsers className="me-2" />
									Manage Users
								</a>
							</div>
						</Card.Body>
					</Card>
				</Col>

				<Col lg={6} className="mb-4">
					<Card>
						<Card.Header>
							<Card.Title className="mb-0">System Status</Card.Title>
						</Card.Header>
						<Card.Body>
							<div className="d-flex justify-content-between align-items-center mb-2">
								<span>Database Connection</span>
								<span className="badge bg-success">Online</span>
							</div>
							<div className="d-flex justify-content-between align-items-center mb-2">
								<span>API Status</span>
								<span className="badge bg-success">Operational</span>
							</div>
							<div className="d-flex justify-content-between align-items-center">
								<span>Cache Status</span>
								<span className="badge bg-success">Active</span>
							</div>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</div>
	);
};