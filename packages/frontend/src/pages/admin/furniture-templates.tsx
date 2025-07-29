import { FurnitureTemplate, DEFAULT_IMAGE_KEYS } from '@stargate/common';
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
	Tabs,
	Tab,
} from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaEye } from 'react-icons/fa';

import FileUpload from '../../components/file-upload';
import { apiClient } from '../../services/api-client';

interface FurnitureTemplateFormData {
	name: string;
	furniture_type: string;
	description: string;
	category: string;
	default_width: number;
	default_height: number;
	default_rotation: number;
	default_image: Record<string, string> | null;
	default_color: string;
	default_style: string;
	default_interactive: boolean;
	default_blocks_movement: boolean;
	default_power_required: number;
	default_active: boolean;
	default_discovered: boolean;
	placement_requirements: string;
	usage_requirements: string;
	min_room_size: number | null;
	max_per_room: number | null;
	compatible_room_types: string;
	tags: string;
	version: string;
	is_active: boolean;
}

const defaultFormData: FurnitureTemplateFormData = {
	name: '',
	furniture_type: '',
	description: '',
	category: '',
	default_width: 32,
	default_height: 32,
	default_rotation: 0,
	default_image: null,
	default_color: '',
	default_style: '',
	default_interactive: false,
	default_blocks_movement: true,
	default_power_required: 0,
	default_active: true,
	default_discovered: false,
	placement_requirements: '{}',
	usage_requirements: '{}',
	min_room_size: null,
	max_per_room: null,
	compatible_room_types: '[]',
	tags: '[]',
	version: '1.0',
	is_active: true,
};

export const FurnitureTemplatesAdmin: React.FC = () => {
	const [templates, setTemplates] = useState<FurnitureTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [showViewModal, setShowViewModal] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState<FurnitureTemplate | null>(null);
	const [viewingTemplate, setViewingTemplate] = useState<FurnitureTemplate | null>(null);
	const [formData, setFormData] = useState<FurnitureTemplateFormData>(defaultFormData);
	const [searchTerm, setSearchTerm] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('');

	useEffect(() => {
		loadTemplates();
	}, []);

	const loadTemplates = async () => {
		try {
			setLoading(true);
			const response = await apiClient.get('/api/data/furniture-templates');
			if (response.data) {
				setTemplates(response.data);
			} else {
				setError(response.error || 'Failed to load furniture templates');
			}
		} catch (err) {
			setError('Failed to load furniture templates');
		} finally {
			setLoading(false);
		}
	};

	const handleOpenModal = (template?: FurnitureTemplate) => {
		if (template) {
			setEditingTemplate(template);
			setFormData({
				name: template.name,
				furniture_type: template.furniture_type,
				description: template.description || '',
				category: template.category || '',
				default_width: template.default_width,
				default_height: template.default_height,
				default_rotation: template.default_rotation,
				default_image: template.default_image || null,
				default_color: template.default_color || '',
				default_style: template.default_style || '',
				default_interactive: template.default_interactive,
				default_blocks_movement: template.default_blocks_movement,
				default_power_required: template.default_power_required,
				default_active: template.default_active,
				default_discovered: template.default_discovered,
				placement_requirements: template.placement_requirements || '{}',
				usage_requirements: template.usage_requirements || '{}',
				min_room_size: template.min_room_size ?? null,
				max_per_room: template.max_per_room ?? null,
				compatible_room_types: template.compatible_room_types || '[]',
				tags: template.tags || '[]',
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
		setError(null);
	};

	const handleViewTemplate = (template: FurnitureTemplate) => {
		setViewingTemplate(template);
		setShowViewModal(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			// Validate JSON fields
			try {
				JSON.parse(formData.placement_requirements || '{}');
				JSON.parse(formData.usage_requirements || '{}');
				JSON.parse(formData.compatible_room_types || '[]');
				JSON.parse(formData.tags || '[]');
			} catch {
				setError('Invalid JSON in requirements, room types, or tags fields');
				return;
			}

			const templateData = {
				...formData,
				id: editingTemplate?.id || `${formData.furniture_type}-template-${Date.now()}`,
				placement_requirements: formData.placement_requirements || null,
				usage_requirements: formData.usage_requirements || null,
				compatible_room_types: formData.compatible_room_types || null,
				tags: formData.tags || null,
				description: formData.description || null,
				category: formData.category || null,
				default_color: formData.default_color || null,
				default_style: formData.default_style || null,
			};

			const response = editingTemplate
				? await apiClient.put(`/api/data/furniture-templates/${editingTemplate.id}`, templateData)
				: await apiClient.post('/api/data/furniture-templates', templateData);

			if (response.data) {
				await loadTemplates();
				handleCloseModal();
			} else {
				setError(response.error || 'Failed to save furniture template');
			}
		} catch (err) {
			setError('Failed to save furniture template');
		}
	};

	const handleDelete = async (template: FurnitureTemplate) => {
		if (!confirm(`Are you sure you want to delete the "${template.name}" template?`)) {
			return;
		}

		try {
			const response = await apiClient.delete(`/api/data/furniture-templates/${template.id}`);
			if (response.data) {
				await loadTemplates();
			} else {
				setError(response.error || 'Failed to delete furniture template');
			}
		} catch (err) {
			setError('Failed to delete furniture template');
		}
	};

	const filteredTemplates = templates.filter(template => {
		const matchesSearch = !searchTerm ||
			template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			template.furniture_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(template.description || '').toLowerCase().includes(searchTerm.toLowerCase());

		const matchesCategory = !categoryFilter || template.category === categoryFilter;

		return matchesSearch && matchesCategory;
	});

	const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];

	const formatJson = (jsonString: string | null) => {
		if (!jsonString) return '{}';
		try {
			return JSON.stringify(JSON.parse(jsonString), null, 2);
		} catch {
			return jsonString;
		}
	};

	if (loading) {
		return (
			<Container>
				<div className="text-center mt-5">
					<div className="spinner-border" role="status">
						<span className="visually-hidden">Loading...</span>
					</div>
				</div>
			</Container>
		);
	}

	return (
		<Container fluid>
			<Row className="mb-4">
				<Col>
					<div className="d-flex justify-content-between align-items-center">
						<h2>Furniture Templates</h2>
						<Button variant="primary" onClick={() => handleOpenModal()}>
							<FaPlus className="me-2" />
							Add Template
						</Button>
					</div>
				</Col>
			</Row>

			{error && (
				<Row className="mb-3">
					<Col>
						<Alert variant="danger" dismissible onClose={() => setError(null)}>
							{error}
						</Alert>
					</Col>
				</Row>
			)}

			<Row className="mb-3">
				<Col md={6}>
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
				<Col md={3}>
					<Form.Select
						value={categoryFilter}
						onChange={(e) => setCategoryFilter(e.target.value)}
					>
						<option value="">All Categories</option>
						{categories.map(category => (
							<option key={category} value={category || ''}>{category}</option>
						))}
					</Form.Select>
				</Col>
			</Row>

			<Row>
				<Col>
					<Card>
						<Card.Body>
							<Table responsive striped hover>
								<thead>
									<tr>
										<th>Name</th>
										<th>Type</th>
										<th>Category</th>
										<th>Size</th>
										<th>Interactive</th>
										<th>Power</th>
										<th>Status</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredTemplates.map((template) => (
										<tr key={template.id}>
											<td>
												<strong>{template.name}</strong>
												{template.description && (
													<div className="text-muted small">
														{template.description.length > 50
															? `${template.description.substring(0, 50)}...`
															: template.description
														}
													</div>
												)}
											</td>
											<td>
												<code>{template.furniture_type}</code>
											</td>
											<td>
												{template.category && (
													<Badge bg="secondary">{template.category}</Badge>
												)}
											</td>
											<td>{template.default_width}×{template.default_height}</td>
											<td>
												<Badge bg={template.default_interactive ? 'success' : 'secondary'}>
													{template.default_interactive ? 'Yes' : 'No'}
												</Badge>
											</td>
											<td>{template.default_power_required}</td>
											<td>
												<Badge bg={template.is_active ? 'success' : 'danger'}>
													{template.is_active ? 'Active' : 'Inactive'}
												</Badge>
											</td>
											<td>
												<ButtonGroup size="sm">
													<Button
														variant="outline-info"
														onClick={() => handleViewTemplate(template)}
														title="View Details"
													>
														<FaEye />
													</Button>
													<Button
														variant="outline-primary"
														onClick={() => handleOpenModal(template)}
														title="Edit"
													>
														<FaEdit />
													</Button>
													<Button
														variant="outline-danger"
														onClick={() => handleDelete(template)}
														title="Delete"
													>
														<FaTrash />
													</Button>
												</ButtonGroup>
											</td>
										</tr>
									))}
								</tbody>
							</Table>

							{filteredTemplates.length === 0 && (
								<div className="text-center text-muted py-4">
									{searchTerm || categoryFilter ? 'No templates match your filters' : 'No furniture templates found'}
								</div>
							)}
						</Card.Body>
					</Card>
				</Col>
			</Row>

			{/* Edit/Create Modal */}
			<Modal show={showModal} onHide={handleCloseModal} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>
						{editingTemplate ? 'Edit Furniture Template' : 'Create Furniture Template'}
					</Modal.Title>
				</Modal.Header>
				<Form onSubmit={handleSubmit}>
					<Modal.Body>
						<Row>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Name *</Form.Label>
									<Form.Control
										type="text"
										value={formData.name}
										onChange={(e) => setFormData({...formData, name: e.target.value})}
										required
									/>
								</Form.Group>
							</Col>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Type *</Form.Label>
									<Form.Control
										type="text"
										value={formData.furniture_type}
										onChange={(e) => setFormData({...formData, furniture_type: e.target.value})}
										required
										placeholder="e.g., stargate, console, bed"
									/>
								</Form.Group>
							</Col>
						</Row>

						<Row>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Category</Form.Label>
									<Form.Control
										type="text"
										value={formData.category}
										onChange={(e) => setFormData({...formData, category: e.target.value})}
										placeholder="e.g., tech, furniture, decoration"
									/>
								</Form.Group>
							</Col>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Version</Form.Label>
									<Form.Control
										type="text"
										value={formData.version}
										onChange={(e) => setFormData({...formData, version: e.target.value})}
									/>
								</Form.Group>
							</Col>
						</Row>

						<Form.Group className="mb-3">
							<Form.Label>Description</Form.Label>
							<Form.Control
								as="textarea"
								rows={3}
								value={formData.description}
								onChange={(e) => setFormData({...formData, description: e.target.value})}
							/>
						</Form.Group>

						<Row>
							<Col md={4}>
								<Form.Group className="mb-3">
									<Form.Label>Width</Form.Label>
									<Form.Control
										type="number"
										value={formData.default_width}
										onChange={(e) => setFormData({...formData, default_width: parseInt(e.target.value)})}
										min="1"
									/>
								</Form.Group>
							</Col>
							<Col md={4}>
								<Form.Group className="mb-3">
									<Form.Label>Height</Form.Label>
									<Form.Control
										type="number"
										value={formData.default_height}
										onChange={(e) => setFormData({...formData, default_height: parseInt(e.target.value)})}
										min="1"
									/>
								</Form.Group>
							</Col>
							<Col md={4}>
								<Form.Group className="mb-3">
									<Form.Label>Power Required</Form.Label>
									<Form.Control
										type="number"
										value={formData.default_power_required}
										onChange={(e) => setFormData({...formData, default_power_required: parseInt(e.target.value)})}
										min="0"
									/>
								</Form.Group>
							</Col>
						</Row>

						<Row>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Color</Form.Label>
									<Form.Control
										type="text"
										value={formData.default_color}
										onChange={(e) => setFormData({...formData, default_color: e.target.value})}
										placeholder="#4A90E2"
									/>
								</Form.Group>
							</Col>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Style</Form.Label>
									<Form.Control
										type="text"
										value={formData.default_style}
										onChange={(e) => setFormData({...formData, default_style: e.target.value})}
										placeholder="ancient, modern, standard"
									/>
								</Form.Group>
							</Col>
						</Row>

						{/* Image Upload Section */}
						<Form.Group className="mb-3">
							<Form.Label>Default Images</Form.Label>
							<Table striped bordered size="sm">
								<thead>
									<tr>
										<th>Image Type</th>
										<th>Current Image</th>
										<th>Upload</th>
									</tr>
								</thead>
								<tbody>
									{DEFAULT_IMAGE_KEYS.map((key) => {
										const currentUrl = formData.default_image?.[key] || '';
										return (
											<tr key={key}>
												<td><strong>{key}</strong></td>
												<td>
													{currentUrl && (
														<img
															src={currentUrl}
															alt={key}
															style={{
																width: '40px',
																height: '40px',
																objectFit: 'cover',
																borderRadius: '4px',
															}}
														/>
													)}
												</td>
												<td>
													<FileUpload
														label={''}
														currentUrl={currentUrl}
														onChange={newUrl => {
															if (!newUrl) {
																// Remove the key if URL is null
																if (formData.default_image) {
																	const updatedImage = { ...formData.default_image };
																	delete updatedImage[key];
																	setFormData({
																		...formData,
																		default_image: Object.keys(updatedImage).length > 0 ? updatedImage : null,
																	});
																}
															} else {
																// Add or update the key
																setFormData({
																	...formData,
																	default_image: {
																		...(formData.default_image || {}),
																		[key]: newUrl,
																	},
																});
															}
														}}
														folder="furniture"
														thumbnailMode={true}
														allowSelection={true}
													/>
												</td>
											</tr>
										);
									})}
								</tbody>
							</Table>
						</Form.Group>

						<Row>
							<Col md={6}>
								<Form.Check
									type="checkbox"
									label="Interactive"
									checked={formData.default_interactive}
									onChange={(e) => setFormData({...formData, default_interactive: e.target.checked})}
									className="mb-3"
								/>
								<Form.Check
									type="checkbox"
									label="Blocks Movement"
									checked={formData.default_blocks_movement}
									onChange={(e) => setFormData({...formData, default_blocks_movement: e.target.checked})}
									className="mb-3"
								/>
							</Col>
							<Col md={6}>
								<Form.Check
									type="checkbox"
									label="Active by Default"
									checked={formData.default_active}
									onChange={(e) => setFormData({...formData, default_active: e.target.checked})}
									className="mb-3"
								/>
								<Form.Check
									type="checkbox"
									label="Template Active"
									checked={formData.is_active}
									onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
									className="mb-3"
								/>
							</Col>
						</Row>

						<Form.Group className="mb-3">
							<Form.Label>Compatible Room Types (JSON Array)</Form.Label>
							<Form.Control
								as="textarea"
								rows={2}
								value={formData.compatible_room_types}
								onChange={(e) => setFormData({...formData, compatible_room_types: e.target.value})}
								placeholder='["gate_room", "transport_room"]'
							/>
						</Form.Group>

						<Form.Group className="mb-3">
							<Form.Label>Tags (JSON Array)</Form.Label>
							<Form.Control
								as="textarea"
								rows={2}
								value={formData.tags}
								onChange={(e) => setFormData({...formData, tags: e.target.value})}
								placeholder='["stargate", "transport", "ancient"]'
							/>
						</Form.Group>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={handleCloseModal}>
							Cancel
						</Button>
						<Button variant="primary" type="submit">
							{editingTemplate ? 'Update' : 'Create'} Template
						</Button>
					</Modal.Footer>
				</Form>
			</Modal>

			{/* View Details Modal */}
			<Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Template Details: {viewingTemplate?.name}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{viewingTemplate && (
						<div>
							<Row>
								<Col md={6}>
									<h6>Basic Information</h6>
									<p><strong>ID:</strong> <code>{viewingTemplate.id}</code></p>
									<p><strong>Type:</strong> <code>{viewingTemplate.furniture_type}</code></p>
									<p><strong>Category:</strong> {viewingTemplate.category || 'None'}</p>
									<p><strong>Version:</strong> {viewingTemplate.version}</p>
									<p><strong>Description:</strong> {viewingTemplate.description || 'None'}</p>
								</Col>
								<Col md={6}>
									<h6>Default Properties</h6>
									<p><strong>Size:</strong> {viewingTemplate.default_width}×{viewingTemplate.default_height}</p>
									<p><strong>Power Required:</strong> {viewingTemplate.default_power_required}</p>
									<p><strong>Interactive:</strong> {viewingTemplate.default_interactive ? 'Yes' : 'No'}</p>
									<p><strong>Blocks Movement:</strong> {viewingTemplate.default_blocks_movement ? 'Yes' : 'No'}</p>
									<p><strong>Active:</strong> {viewingTemplate.default_active ? 'Yes' : 'No'}</p>
								</Col>
							</Row>

							{viewingTemplate.compatible_room_types && (
								<div className="mt-3">
									<h6>Compatible Room Types</h6>
									<pre className="bg-light p-2 rounded">
										{formatJson(viewingTemplate.compatible_room_types)}
									</pre>
								</div>
							)}

							{viewingTemplate.tags && (
								<div className="mt-3">
									<h6>Tags</h6>
									<pre className="bg-light p-2 rounded">
										{formatJson(viewingTemplate.tags)}
									</pre>
								</div>
							)}
						</div>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowViewModal(false)}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	);
};
