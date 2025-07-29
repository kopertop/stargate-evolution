import React, { useEffect, useState, useRef } from 'react';
import { Card, Col, Row, Button, Alert } from 'react-bootstrap';
import { FaUsers, FaRobot, FaDoorOpen, FaToolbox, FaChartLine, FaDownload, FaUpload, FaDatabase } from 'react-icons/fa';

import { adminService } from '../../services/admin-service';
import { characterService } from '../../services/character-service';

export const AdminOverview: React.FC = () => {
	const [stats, setStats] = useState({
		users: 0,
		characters: 0,
		rooms: 0,
		doors: 0,
		furniture: 0,
		technologies: 0,
		loading: true,
	});

	const [templateOperations, setTemplateOperations] = useState({
		exporting: false,
		importing: false,
		message: null as string | null,
		error: null as string | null,
	});

	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		loadStats();
	}, []);

	const loadStats = async () => {
		try {
			const [users, characters, rooms, doors, furniture, technologies] = await Promise.all([
				adminService.getUsers(),
				characterService.getAllCharacters(),
				adminService.getAllRooms(),
				adminService.getAllDoors(),
				adminService.getAllFurniture(),
				adminService.getAllTechnologyTemplates(),
			]);

			setStats({
				users: users.length,
				characters: characters.length,
				rooms: rooms.length,
				doors: doors.length,
				furniture: furniture.length,
				technologies: technologies.length,
				loading: false,
			});
		} catch (error) {
			console.error('Failed to load admin stats:', error);
			setStats(prev => ({ ...prev, loading: false }));
		}
	};

	const handleExportTemplates = async () => {
		try {
			setTemplateOperations(prev => ({ ...prev, exporting: true, error: null, message: null }));

			await adminService.downloadTemplateData();

			setTemplateOperations(prev => ({
				...prev,
				exporting: false,
				message: 'Template data exported successfully!',
			}));

			// Clear message after 3 seconds
			setTimeout(() => {
				setTemplateOperations(prev => ({ ...prev, message: null }));
			}, 3000);

		} catch (error) {
			console.error('Failed to export templates:', error);
			setTemplateOperations(prev => ({
				...prev,
				exporting: false,
				error: error instanceof Error ? error.message : 'Export failed',
			}));
		}
	};

	const handleImportTemplates = async (file: File) => {
		try {
			setTemplateOperations(prev => ({ ...prev, importing: true, error: null, message: null }));

			const result = await adminService.uploadTemplateDataFromFile(file);

			setTemplateOperations(prev => ({
				...prev,
				importing: false,
				message: `Import successful! ${result.totalImported} records imported.`,
			}));

			// Reload stats to reflect new data
			loadStats();

			// Clear message after 5 seconds
			setTimeout(() => {
				setTemplateOperations(prev => ({ ...prev, message: null }));
			}, 5000);

		} catch (error) {
			console.error('Failed to import templates:', error);
			setTemplateOperations(prev => ({
				...prev,
				importing: false,
				error: error instanceof Error ? error.message : 'Import failed',
			}));
		}
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			if (file.type !== 'application/json') {
				setTemplateOperations(prev => ({
					...prev,
					error: 'Please select a JSON file.',
				}));
				return;
			}
			handleImportTemplates(file);
		}
		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
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

			{/* Template Data Management Section */}
			<Row>
				<Col lg={12} className="mb-4">
					<Card>
						<Card.Header>
							<Card.Title className="mb-0">
								<FaDatabase className="me-2" />
								Template Data Management
							</Card.Title>
						</Card.Header>
						<Card.Body>
							{templateOperations.message && (
								<Alert variant="success" dismissible onClose={() => setTemplateOperations(prev => ({ ...prev, message: null }))}>
									{templateOperations.message}
								</Alert>
							)}

							{templateOperations.error && (
								<Alert variant="danger" dismissible onClose={() => setTemplateOperations(prev => ({ ...prev, error: null }))}>
									{templateOperations.error}
								</Alert>
							)}

							<div className="row">
								<div className="col-md-6">
									<h6>Export Template Data</h6>
									<p className="text-muted small mb-3">
										Download all template data (rooms, doors, furniture, etc.) as a comprehensive JSON file.
										This creates a complete backup that can be imported later.
									</p>
									<Button
										variant="primary"
										onClick={handleExportTemplates}
										disabled={templateOperations.exporting}
									>
										<FaDownload className="me-2" />
										{templateOperations.exporting ? 'Exporting...' : 'Export All Templates'}
									</Button>
								</div>

								<div className="col-md-6">
									<h6>Import Template Data</h6>
									<p className="text-muted small mb-3">
										Import template data from a JSON file. <strong>Warning:</strong> This will replace all existing
										template data (rooms, doors, furniture, etc.). Make sure to export current data first!
									</p>
									<div className="d-flex gap-2">
										<Button
											variant="warning"
											onClick={() => fileInputRef.current?.click()}
											disabled={templateOperations.importing}
										>
											<FaUpload className="me-2" />
											{templateOperations.importing ? 'Importing...' : 'Import Templates'}
										</Button>
										<input
											ref={fileInputRef}
											type="file"
											accept=".json"
											onChange={handleFileSelect}
											style={{ display: 'none' }}
										/>
									</div>
								</div>
							</div>

							<hr className="my-4" />

							<div className="row">
								<div className="col-12">
									<h6>Current Template Data</h6>
									<div className="row text-center">
										<div className="col-6 col-md-3 mb-2">
											<div className="border rounded p-2">
												<div className="h5 mb-1">{stats.loading ? '...' : stats.rooms}</div>
												<div className="small text-muted">Rooms</div>
											</div>
										</div>
										<div className="col-6 col-md-3 mb-2">
											<div className="border rounded p-2">
												<div className="h5 mb-1">{stats.loading ? '...' : stats.doors}</div>
												<div className="small text-muted">Doors</div>
											</div>
										</div>
										<div className="col-6 col-md-3 mb-2">
											<div className="border rounded p-2">
												<div className="h5 mb-1">{stats.loading ? '...' : stats.furniture}</div>
												<div className="small text-muted">Furniture</div>
											</div>
										</div>
										<div className="col-6 col-md-3 mb-2">
											<div className="border rounded p-2">
												<div className="h5 mb-1">{stats.loading ? '...' : stats.technologies}</div>
												<div className="small text-muted">Technologies</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</div>
	);
};
