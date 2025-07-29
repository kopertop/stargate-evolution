import { RoomTemplate } from '@stargate/common';
import React, { useState, useEffect } from 'react';
import {
	Container,
	Row,
	Col,
	Card,
	Button,
	Table,
	Modal,
	Form,
	Alert,
	Badge,
	InputGroup,
	ButtonGroup,
} from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaCubes } from 'react-icons/fa';

import { RoomTemplateVisualEditor } from '../../components/room-template-visual-editor';
import { AdminService } from '../../services/admin-service';

interface RoomTemplateFormData {
	layout_id: string;
	type: string;
	name: string;
	description: string;
	default_width: number;
	default_height: number;
	default_image: string;
	category: string;
	min_width: number | null;
	max_width: number | null;
	min_height: number | null;
	max_height: number | null;
	placement_requirements: string;
	compatible_layouts: string;
	tags: string;
	version: string;
	is_active: boolean;
}

const defaultFormData: RoomTemplateFormData = {
	layout_id: '',
	type: '',
	name: '',
	description: '',
	default_width: 10,
	default_height: 10,
	default_image: '',
	category: '',
	min_width: null,
	max_width: null,
	min_height: null,
	max_height: null,
	placement_requirements: '',
	compatible_layouts: '',
	tags: '',
	version: '1.0',
	is_active: true,
};

const ROOM_TYPES = [
	'bridge', 'engine_room', 'quarters', 'cargo_bay', 'medical_bay',
	'lab', 'armory', 'hangar', 'dining_hall', 'hydroponics',
	'storage', 'corridor', 'transporter_room', 'observation_deck',
];

const ROOM_CATEGORIES = [
	'command', 'engineering', 'living', 'storage', 'medical',
	'research', 'defense', 'transportation', 'recreation', 'utility',
];

export const AdminRoomTemplates: React.FC = () => {
	const [templates, setTemplates] = useState<RoomTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState<RoomTemplate | null>(null);
	const [formData, setFormData] = useState<RoomTemplateFormData>(defaultFormData);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterCategory, setFilterCategory] = useState<string>('all');
	const [filterType, setFilterType] = useState<string>('all');

	const adminService = new AdminService();

	useEffect(() => {
		loadTemplates();
	}, []);

	const loadTemplates = async () => {
		try {
			setLoading(true);
			const data = await adminService.getAllRoomTemplates();
			setTemplates(data);
			setError(null);
		} catch (err) {
			console.error('Failed to load room templates:', err);
			setError(err instanceof Error ? err.message : 'Failed to load room templates');
		} finally {
			setLoading(false);
		}
	};

	const handleShowModal = (template: RoomTemplate | null = null) => {
		if (template) {
			setEditingTemplate(template);
			setFormData({
				layout_id: template.layout_id,
				type: template.type,
				name: template.name,
				description: template.description || '',
				default_width: template.default_width,
				default_height: template.default_height,
				default_image: template.default_image || '',
				category: template.category || '',
				min_width: template.min_width || null,
				max_width: template.max_width || null,
				min_height: template.min_height || null,
				max_height: template.max_height || null,
				placement_requirements: template.placement_requirements || '',
				compatible_layouts: template.compatible_layouts || '',
				tags: template.tags || '',
				version: template.version,
				is_active: template.is_active,
			});
		} else {
			setEditingTemplate(null);
			setFormData(defaultFormData);
		}
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingTemplate(null);
		setFormData(defaultFormData);
	};

	const handleInputChange = (field: keyof RoomTemplateFormData, value: string | number | boolean | null) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const templateData = {
				...formData,
				description: formData.description || null,
				default_image: formData.default_image || null,
				category: formData.category || null,
				placement_requirements: formData.placement_requirements || null,
				compatible_layouts: formData.compatible_layouts || null,
				tags: formData.tags || null,
			};

			if (editingTemplate) {
				await adminService.updateRoomTemplate(editingTemplate.id, templateData);
			} else {
				await adminService.createRoomTemplate(templateData);
			}

			await loadTemplates();
			handleCloseModal();
		} catch (err) {
			console.error('Failed to save room template:', err);
			setError(err instanceof Error ? err.message : 'Failed to save room template');
		}
	};

	const handleDelete = async (template: RoomTemplate) => {
		if (!confirm(`Are you sure you want to delete the room template "${template.name}"?`)) {
			return;
		}

		try {
			await adminService.deleteRoomTemplate(template.id);
			await loadTemplates();
		} catch (err) {
			console.error('Failed to delete room template:', err);
			setError(err instanceof Error ? err.message : 'Failed to delete room template');
		}
	};

	const filteredTemplates = templates.filter(template => {
		const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			template.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));

		const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
		const matchesType = filterType === 'all' || template.type === filterType;

		return matchesSearch && matchesCategory && matchesType;
	});

	const uniqueCategories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)));
	const uniqueTypes = Array.from(new Set(templates.map(t => t.type)));

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
		<Container fluid>
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h1>
					<FaCubes className="me-2" />
					Room Templates
				</h1>
				<Button variant="primary" onClick={() => handleShowModal()}>
					<FaPlus className="me-2" />
					Add Room Template
				</Button>
			</div>

			{error && (
				<Alert variant="danger" dismissible onClose={() => setError(null)}>
					<strong>Error:</strong> {error}
				</Alert>
			)}

			{/* Search and Filters */}
			<Card className="mb-4">
				<Card.Body>
					<Row>
						<Col md={4}>
							<InputGroup>
								<InputGroup.Text>
									<FaSearch />
								</InputGroup.Text>
								<Form.Control
									type="text"
									placeholder="Search templates..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</InputGroup>
						</Col>
						<Col md={4}>
							<Form.Select
								value={filterCategory}
								onChange={(e) => setFilterCategory(e.target.value)}
							>
								<option value="all">All Categories</option>
								{uniqueCategories.map(category => (
									<option key={category} value={category || ''}>{category}</option>
								))}
							</Form.Select>
						</Col>
						<Col md={4}>
							<Form.Select
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
							>
								<option value="all">All Types</option>
								{uniqueTypes.map(type => (
									<option key={type} value={type}>{type}</option>
								))}
							</Form.Select>
						</Col>
					</Row>
				</Card.Body>
			</Card>

			{/* Templates Table */}
			<Card>
				<Card.Header>
					<h5 className="mb-0">Room Templates ({filteredTemplates.length})</h5>
				</Card.Header>
				<Card.Body className="p-0">
					{filteredTemplates.length === 0 ? (
						<div className="text-center p-4">
							<p className="text-muted mb-0">No room templates found.</p>
						</div>
					) : (
						<Table striped hover responsive className="mb-0">
							<thead>
								<tr>
									<th>Name</th>
									<th>Type</th>
									<th>Category</th>
									<th>Dimensions</th>
									<th>Layout</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredTemplates.map(template => (
									<tr key={template.id}>
										<td>
											<strong>{template.name}</strong>
											{template.description && (
												<div className="text-muted small">{template.description}</div>
											)}
										</td>
										<td>
											<Badge bg="secondary">{template.type}</Badge>
										</td>
										<td>
											{template.category && (
												<Badge bg="info">{template.category}</Badge>
											)}
										</td>
										<td>
											<code>{template.default_width} × {template.default_height}</code>
											{(template.min_width || template.max_width) && (
												<div className="text-muted small">
													Range: {template.min_width || '?'} - {template.max_width || '?'}
												</div>
											)}
										</td>
										<td>
											<code>{template.layout_id}</code>
										</td>
										<td>
											<Badge bg={template.is_active ? 'success' : 'secondary'}>
												{template.is_active ? 'Active' : 'Inactive'}
											</Badge>
										</td>
										<td>
											<ButtonGroup size="sm">
												<Button
													variant="outline-primary"
													onClick={() => handleShowModal(template)}
												>
													<FaEdit />
												</Button>
												<Button
													variant="outline-danger"
													onClick={() => handleDelete(template)}
												>
													<FaTrash />
												</Button>
											</ButtonGroup>
										</td>
									</tr>
								))}
							</tbody>
						</Table>
					)}
				</Card.Body>
			</Card>

			{/* Room Template Form Modal */}
			<Modal
				show={showModal}
				onHide={handleCloseModal}
				size="xl"
				style={{ padding: 0 }}
			>
				<Modal.Header closeButton>
					<Modal.Title>
						{editingTemplate ? 'Edit Room Template' : 'Add Room Template'}
					</Modal.Title>
				</Modal.Header>
				<Form onSubmit={handleSubmit} style={{ margin: 0, padding: 0 }}>
					<Modal.Body style={{ padding: 0, margin: 0, maxHeight: 'calc(90vh - 120px)' }}>
						<Row style={{
							margin: 0,
							padding: 0,
							minHeight: '500px',
							boxSizing: 'border-box',
						}} className="g-0">
							{/* Left Panel - Visual Editor */}
							<Col
								className="g-0"
								md={8}
								style={{
									padding: 0,
									margin: 0,
									borderRight: '1px solid #dee2e6',
									display: 'flex',
									flexDirection: 'column',
								}}>
								{editingTemplate && (
									<RoomTemplateVisualEditor
										roomTemplate={{
											id: editingTemplate.id,
											layout_id: formData.layout_id,
											name: formData.name,
											default_width: formData.default_width,
											version: editingTemplate.version,
											is_active: editingTemplate.is_active,
											created_at: editingTemplate.created_at,
											updated_at: editingTemplate.updated_at,
											type: formData.type,
											category: formData.category,
											description: formData.description,
											default_height: formData.default_height,
										}}
										onRoomSizeChange={(width, height) => {
											handleInputChange('default_width', width);
											handleInputChange('default_height', height);
										}}
									/>
								)}
							</Col>

							{/* Right Panel - Properties */}
							<Col md={4} style={{ padding: '1rem', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
								<Row>
									<Col md={12}>
										<Form.Group className="mb-3">
											<Form.Label>Name *</Form.Label>
											<Form.Control
												type="text"
												value={formData.name}
												onChange={(e) => handleInputChange('name', e.target.value)}
												required
											/>
										</Form.Group>
									</Col>
								</Row>

								<Row>
									<Col md={12}>
										<Form.Group className="mb-3">
											<Form.Label>Type *</Form.Label>
											<Form.Select
												value={formData.type}
												onChange={(e) => handleInputChange('type', e.target.value)}
												required
											>
												<option value="">Select type...</option>
												{ROOM_TYPES.map(type => (
													<option key={type} value={type}>{type}</option>
												))}
											</Form.Select>
										</Form.Group>
									</Col>
								</Row>

								<Form.Group className="mb-3">
									<Form.Label>Description</Form.Label>
									<Form.Control
										as="textarea"
										rows={2}
										value={formData.description}
										onChange={(e) => handleInputChange('description', e.target.value)}
									/>
								</Form.Group>

								<Row>
									<Col md={12}>
										<Form.Group className="mb-3">
											<Form.Label>Layout ID *</Form.Label>
											<Form.Control
												type="text"
												value={formData.layout_id}
												onChange={(e) => handleInputChange('layout_id', e.target.value)}
												required
											/>
										</Form.Group>
									</Col>
								</Row>

								<Row>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Category</Form.Label>
											<Form.Select
												value={formData.category}
												onChange={(e) => handleInputChange('category', e.target.value)}
											>
												<option value="">Select category...</option>
												{ROOM_CATEGORIES.map(category => (
													<option key={category} value={category || ''}>{category}</option>
												))}
											</Form.Select>
										</Form.Group>
									</Col>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Version</Form.Label>
											<Form.Control
												type="text"
												value={formData.version}
												onChange={(e) => handleInputChange('version', e.target.value)}
											/>
										</Form.Group>
									</Col>
								</Row>

								<Row>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Default Width *</Form.Label>
											<Form.Control
												type="number"
												value={formData.default_width}
												onChange={(e) => handleInputChange('default_width', parseInt(e.target.value))}
												required
												min={1}
											/>
										</Form.Group>
									</Col>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Default Height *</Form.Label>
											<Form.Control
												type="number"
												value={formData.default_height}
												onChange={(e) => handleInputChange('default_height', parseInt(e.target.value))}
												required
												min={1}
											/>
										</Form.Group>
									</Col>
								</Row>

								<Row>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Min Width</Form.Label>
											<Form.Control
												type="number"
												value={formData.min_width || ''}
												onChange={(e) => handleInputChange('min_width', e.target.value ? parseInt(e.target.value) : null)}
												min={1}
											/>
										</Form.Group>
									</Col>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Max Width</Form.Label>
											<Form.Control
												type="number"
												value={formData.max_width || ''}
												onChange={(e) => handleInputChange('max_width', e.target.value ? parseInt(e.target.value) : null)}
												min={1}
											/>
										</Form.Group>
									</Col>
								</Row>

								<Row>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Min Height</Form.Label>
											<Form.Control
												type="number"
												value={formData.min_height || ''}
												onChange={(e) => handleInputChange('min_height', e.target.value ? parseInt(e.target.value) : null)}
												min={1}
											/>
										</Form.Group>
									</Col>
									<Col md={6}>
										<Form.Group className="mb-3">
											<Form.Label>Max Height</Form.Label>
											<Form.Control
												type="number"
												value={formData.max_height || ''}
												onChange={(e) => handleInputChange('max_height', e.target.value ? parseInt(e.target.value) : null)}
												min={1}
											/>
										</Form.Group>
									</Col>
								</Row>

								<Row>
									<Col md={12}>
										<Form.Group className="mb-3">
											<Form.Label>Default Image</Form.Label>
											<Form.Control
												type="text"
												value={formData.default_image}
												onChange={(e) => handleInputChange('default_image', e.target.value)}
												placeholder="image.png"
											/>
										</Form.Group>
									</Col>
								</Row>

								<Row>
									<Col md={12}>
										<Form.Group className="mb-3">
											<Form.Label>Tags</Form.Label>
											<Form.Control
												type="text"
												value={formData.tags}
												onChange={(e) => handleInputChange('tags', e.target.value)}
												placeholder="tag1,tag2,tag3"
											/>
										</Form.Group>
									</Col>
								</Row>

								<Form.Group className="mb-3">
									<Form.Label>Compatible Layouts (JSON)</Form.Label>
									<Form.Control
										as="textarea"
										rows={2}
										value={formData.compatible_layouts}
										onChange={(e) => handleInputChange('compatible_layouts', e.target.value)}
										placeholder='["layout1", "layout2"]'
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Label>Placement Requirements (JSON)</Form.Label>
									<Form.Control
										as="textarea"
										rows={2}
										value={formData.placement_requirements}
										onChange={(e) => handleInputChange('placement_requirements', e.target.value)}
										placeholder='{"adjacent_to": ["corridor"], "not_adjacent_to": ["engine_room"]}'
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Check
										type="checkbox"
										label="Active"
										checked={formData.is_active}
										onChange={(e) => handleInputChange('is_active', e.target.checked)}
									/>
								</Form.Group>
							</Col>
						</Row>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={handleCloseModal}>
							Cancel
						</Button>
						<Button variant="primary" type="submit">
							{editingTemplate ? 'Update' : 'Create'} Room Template
						</Button>
					</Modal.Footer>
				</Form>
			</Modal>
		</Container>
	);
};
