import { TechnologyTemplate } from '@stargate/common';
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
import { FaPlus, FaEdit, FaTrash, FaSearch, FaToolbox } from 'react-icons/fa';

import { AdminService } from '../../services/admin-service';

interface TechnologyTemplateFormData {
	name: string;
	description: string;
	category: string;
	unlock_requirements: string;
	cost: number;
	image: string;
}

const defaultFormData: TechnologyTemplateFormData = {
	name: '',
	description: '',
	category: '',
	unlock_requirements: '',
	cost: 0,
	image: '',
};

const TECHNOLOGY_CATEGORIES = [
	'ship_systems', 'ancient_technology', 'weapons', 'medical',
	'research', 'engineering', 'communication', 'defense'
];

export const AdminTechnologies: React.FC = () => {
	const [technologies, setTechnologies] = useState<TechnologyTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [editingTechnology, setEditingTechnology] = useState<TechnologyTemplate | null>(null);
	const [formData, setFormData] = useState<TechnologyTemplateFormData>(defaultFormData);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterCategory, setFilterCategory] = useState<string>('all');

	const adminService = new AdminService();

	useEffect(() => {
		loadTechnologies();
	}, []);

	const loadTechnologies = async () => {
		try {
			setLoading(true);
			const data = await adminService.getAllTechnologyTemplates();
			setTechnologies(data);
			setError(null);
		} catch (err) {
			console.error('Failed to load technology templates:', err);
			setError(err instanceof Error ? err.message : 'Failed to load technology templates');
		} finally {
			setLoading(false);
		}
	};

	const handleShowModal = (technology: TechnologyTemplate | null = null) => {
		if (technology) {
			setEditingTechnology(technology);
			setFormData({
				name: technology.name,
				description: technology.description || '',
				category: technology.category || '',
				unlock_requirements: technology.unlock_requirements || '',
				cost: technology.cost || 0,
				image: technology.image || '',
			});
		} else {
			setEditingTechnology(null);
			setFormData(defaultFormData);
		}
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingTechnology(null);
		setFormData(defaultFormData);
	};

	const handleInputChange = (field: keyof TechnologyTemplateFormData, value: string | number) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const technologyData = {
				...formData,
				description: formData.description || null,
				category: formData.category || null,
				unlock_requirements: formData.unlock_requirements || null,
				image: formData.image || null,
			};

			if (editingTechnology) {
				await adminService.updateTechnology(editingTechnology.id, technologyData);
			} else {
				// Generate ID from name for new technologies
				const id = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
				await adminService.createTechnology({ id, ...technologyData });
			}

			await loadTechnologies();
			handleCloseModal();
		} catch (err) {
			console.error('Failed to save technology template:', err);
			setError(err instanceof Error ? err.message : 'Failed to save technology template');
		}
	};

	const handleDelete = async (technology: TechnologyTemplate) => {
		if (!confirm(`Are you sure you want to delete the technology template "${technology.name}"?`)) {
			return;
		}

		try {
			await adminService.deleteTechnology(technology.id);
			await loadTechnologies();
		} catch (err) {
			console.error('Failed to delete technology template:', err);
			setError(err instanceof Error ? err.message : 'Failed to delete technology template');
		}
	};

	const filteredTechnologies = technologies.filter(technology => {
		const matchesSearch = technology.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(technology.description && technology.description.toLowerCase().includes(searchTerm.toLowerCase()));
		
		const matchesCategory = filterCategory === 'all' || technology.category === filterCategory;
		
		return matchesSearch && matchesCategory;
	});

	const uniqueCategories = Array.from(new Set(technologies.map(t => t.category).filter(Boolean)));

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
					<FaToolbox className="me-2" />
					Technology Templates
				</h1>
				<Button variant="primary" onClick={() => handleShowModal()}>
					<FaPlus className="me-2" />
					Add Technology Template
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
						<Col md={8}>
							<InputGroup>
								<InputGroup.Text>
									<FaSearch />
								</InputGroup.Text>
								<Form.Control
									type="text"
									placeholder="Search technologies..."
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
									<option key={category} value={category}>{category}</option>
								))}
							</Form.Select>
						</Col>
					</Row>
				</Card.Body>
			</Card>

			{/* Statistics */}
			<Row className="mb-4">
				<Col md={3}>
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-primary">{technologies.length}</h3>
							<small className="text-muted">Total Technologies</small>
						</Card.Body>
					</Card>
				</Col>
				<Col md={3}>
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-success">{uniqueCategories.length}</h3>
							<small className="text-muted">Categories</small>
						</Card.Body>
					</Card>
				</Col>
				<Col md={3}>
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-info">{technologies.filter(t => t.cost && t.cost > 0).length}</h3>
							<small className="text-muted">With Cost</small>
						</Card.Body>
					</Card>
				</Col>
				<Col md={3}>
					<Card className="text-center">
						<Card.Body>
							<h3 className="text-warning">{technologies.filter(t => t.unlock_requirements).length}</h3>
							<small className="text-muted">With Requirements</small>
						</Card.Body>
					</Card>
				</Col>
			</Row>

			{/* Technologies Table */}
			<Card>
				<Card.Header>
					<h5 className="mb-0">Technology Templates ({filteredTechnologies.length})</h5>
				</Card.Header>
				<Card.Body className="p-0">
					{filteredTechnologies.length === 0 ? (
						<div className="text-center p-4">
							<p className="text-muted mb-0">No technology templates found.</p>
						</div>
					) : (
						<Table striped hover responsive className="mb-0">
							<thead>
								<tr>
									<th>Name</th>
									<th>Category</th>
									<th>Cost</th>
									<th>Requirements</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredTechnologies.map(technology => (
									<tr key={technology.id}>
										<td>
											<strong>{technology.name}</strong>
											{technology.description && (
												<div className="text-muted small">{technology.description}</div>
											)}
										</td>
										<td>
											{technology.category && (
												<Badge bg="info">{technology.category}</Badge>
											)}
										</td>
										<td>
											{technology.cost ? (
												<Badge bg="warning">{technology.cost}</Badge>
											) : (
												<span className="text-muted">Free</span>
											)}
										</td>
										<td>
											{technology.unlock_requirements ? (
												<Badge bg="secondary">Required</Badge>
											) : (
												<span className="text-muted">None</span>
											)}
										</td>
										<td>
											<ButtonGroup size="sm">
												<Button
													variant="outline-primary"
													onClick={() => handleShowModal(technology)}
												>
													<FaEdit />
												</Button>
												<Button
													variant="outline-danger"
													onClick={() => handleDelete(technology)}
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

			{/* Technology Template Form Modal */}
			<Modal show={showModal} onHide={handleCloseModal} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>
						{editingTechnology ? 'Edit Technology Template' : 'Add Technology Template'}
					</Modal.Title>
				</Modal.Header>
				<Form onSubmit={handleSubmit}>
					<Modal.Body>
						<Form.Group className="mb-3">
							<Form.Label>Name *</Form.Label>
							<Form.Control
								type="text"
								value={formData.name}
								onChange={(e) => handleInputChange('name', e.target.value)}
								required
							/>
						</Form.Group>

						<Form.Group className="mb-3">
							<Form.Label>Description</Form.Label>
							<Form.Control
								as="textarea"
								rows={3}
								value={formData.description}
								onChange={(e) => handleInputChange('description', e.target.value)}
							/>
						</Form.Group>

						<Row>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Category</Form.Label>
									<Form.Select
										value={formData.category}
										onChange={(e) => handleInputChange('category', e.target.value)}
									>
										<option value="">Select category...</option>
										{TECHNOLOGY_CATEGORIES.map(category => (
											<option key={category} value={category}>{category}</option>
										))}
									</Form.Select>
								</Form.Group>
							</Col>
							<Col md={6}>
								<Form.Group className="mb-3">
									<Form.Label>Cost</Form.Label>
									<Form.Control
										type="number"
										value={formData.cost}
										onChange={(e) => handleInputChange('cost', parseInt(e.target.value) || 0)}
										min={0}
									/>
								</Form.Group>
							</Col>
						</Row>

						<Form.Group className="mb-3">
							<Form.Label>Image</Form.Label>
							<Form.Control
								type="text"
								value={formData.image}
								onChange={(e) => handleInputChange('image', e.target.value)}
								placeholder="technology-image.png"
							/>
						</Form.Group>

						<Form.Group className="mb-3">
							<Form.Label>Unlock Requirements</Form.Label>
							<Form.Control
								as="textarea"
								rows={3}
								value={formData.unlock_requirements}
								onChange={(e) => handleInputChange('unlock_requirements', e.target.value)}
								placeholder="Requirements to unlock this technology (optional)"
							/>
						</Form.Group>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={handleCloseModal}>
							Cancel
						</Button>
						<Button variant="primary" type="submit">
							{editingTechnology ? 'Update' : 'Create'} Technology Template
						</Button>
					</Modal.Footer>
				</Form>
			</Modal>
		</Container>
	);
};