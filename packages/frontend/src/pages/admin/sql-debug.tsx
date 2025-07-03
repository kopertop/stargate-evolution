import React, { useState, useEffect } from 'react';
import {
	Container,
	Row,
	Col,
	Card,
	Form,
	Button,
	Alert,
	Table,
	Tabs,
	Tab,
	Badge,
	Spinner,
	Modal,
	Dropdown,
	Pagination,
} from 'react-bootstrap';
import { toast } from 'react-toastify';

import { AdminSqlService, SqlQueryResult, DatabaseSchema, TableData } from '../../services/admin-sql-service';

export const SqlDebugPage: React.FC = () => {
	// Query execution state
	const [query, setQuery] = useState('');
	const [queryParams, setQueryParams] = useState('');
	const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
	const [isExecuting, setIsExecuting] = useState(false);
	const [queryValidation, setQueryValidation] = useState<{ isValid: boolean; warnings: string[]; errors: string[] } | null>(null);

	// Schema browser state
	const [schema, setSchema] = useState<DatabaseSchema | null>(null);
	const [isLoadingSchema, setIsLoadingSchema] = useState(false);
	const [selectedTable, setSelectedTable] = useState<string | null>(null);
	const [tableData, setTableData] = useState<TableData | null>(null);
	const [isLoadingTableData, setIsLoadingTableData] = useState(false);
	const [tablePage, setTablePage] = useState(0);
	const [tablePageSize, setTablePageSize] = useState(100);

	// UI state
	const [activeTab, setActiveTab] = useState('query');
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [pendingQuery, setPendingQuery] = useState('');

	// Load database schema on component mount
	useEffect(() => {
		loadDatabaseSchema();
	}, []);

	// Validate query as user types
	useEffect(() => {
		if (query.trim()) {
			const validation = AdminSqlService.validateQuery(query);
			setQueryValidation(validation);
		} else {
			setQueryValidation(null);
		}
	}, [query]);

	const loadDatabaseSchema = async () => {
		setIsLoadingSchema(true);
		try {
			const schemaData = await AdminSqlService.getDatabaseSchema();
			setSchema(schemaData);
			console.log('[SQL-DEBUG] Schema loaded:', schemaData);
		} catch (error) {
			console.error('[SQL-DEBUG] Failed to load schema:', error);
			toast.error('Failed to load database schema');
		} finally {
			setIsLoadingSchema(false);
		}
	};

	const executeQuery = async (queryToExecute: string) => {
		if (!queryToExecute.trim()) {
			toast.error('Please enter a query');
			return;
		}

		setIsExecuting(true);
		setQueryResult(null);

		try {
			// Parse query parameters if provided
			let params: any[] = [];
			if (queryParams.trim()) {
				try {
					params = JSON.parse(queryParams);
					if (!Array.isArray(params)) {
						throw new Error('Parameters must be an array');
					}
				} catch (error) {
					toast.error('Invalid JSON in query parameters');
					setIsExecuting(false);
					return;
				}
			}

			const result = await AdminSqlService.executeQuery(queryToExecute, params);
			setQueryResult(result);

			if (result.success) {
				toast.success(`Query executed successfully! ${result.isReadOnly ? 'Rows returned' : 'Rows affected'}: ${result.isReadOnly ? (Array.isArray(result.result) ? result.result.length : 0) : result.affectedRows}`);
			}
		} catch (error) {
			console.error('[SQL-DEBUG] Query execution failed:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			toast.error(`Query failed: ${errorMessage}`);
			setQueryResult({
				success: false,
				isReadOnly: false,
				result: null,
				affectedRows: 0,
				executedAt: new Date().toISOString(),
				executedBy: 'Unknown',
				error: errorMessage,
			});
		} finally {
			setIsExecuting(false);
		}
	};

	const handleExecuteQuery = () => {
		const validation = AdminSqlService.validateQuery(query);

		// If there are warnings, show confirmation modal
		if (validation.warnings.length > 0) {
			setPendingQuery(query);
			setShowConfirmModal(true);
		} else {
			executeQuery(query);
		}
	};

	const confirmExecuteQuery = () => {
		setShowConfirmModal(false);
		executeQuery(pendingQuery);
		setPendingQuery('');
	};

	const loadTableData = async (tableName: string, page: number = 0) => {
		setIsLoadingTableData(true);
		setSelectedTable(tableName);
		setTablePage(page);

		try {
			const offset = page * tablePageSize;
			const data = await AdminSqlService.getTableData(tableName, tablePageSize, offset);
			setTableData(data);
			console.log('[SQL-DEBUG] Table data loaded:', data);
		} catch (error) {
			console.error('[SQL-DEBUG] Failed to load table data:', error);
			toast.error(`Failed to load table data: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsLoadingTableData(false);
		}
	};

	const insertSampleQuery = (sampleQuery: string) => {
		setQuery(sampleQuery);
		setActiveTab('query');
	};

	const renderQueryResult = () => {
		if (!queryResult) return null;

		if (!queryResult.success) {
			return (
				<Alert variant="danger">
					<Alert.Heading>Query Failed</Alert.Heading>
					<p><strong>Error:</strong> {queryResult.error}</p>
					{queryResult.details && (
						<p><strong>Details:</strong> {queryResult.details}</p>
					)}
					<hr />
					<small>Executed at: {new Date(queryResult.executedAt).toLocaleString()}</small>
				</Alert>
			);
		}

		return (
			<Alert variant="success">
				<Alert.Heading>Query Executed Successfully</Alert.Heading>
				<Row>
					<Col md={6}>
						<p><strong>Type:</strong> {queryResult.isReadOnly ? 'Read-only' : 'Write operation'}</p>
						<p><strong>Affected/Returned Rows:</strong> {queryResult.isReadOnly ? (Array.isArray(queryResult.result) ? queryResult.result.length : 0) : queryResult.affectedRows}</p>
					</Col>
					<Col md={6}>
						<p><strong>Executed by:</strong> {queryResult.executedBy}</p>
						<p><strong>Executed at:</strong> {new Date(queryResult.executedAt).toLocaleString()}</p>
					</Col>
				</Row>

				{queryResult.isReadOnly && Array.isArray(queryResult.result) && queryResult.result.length > 0 && (
					<>
						<hr />
						<h6>Results:</h6>
						<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
							<Table striped bordered hover size="sm">
								<thead>
									<tr>
										{Object.keys(queryResult.result[0]).map(key => (
											<th key={key}>{key}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{queryResult.result.map((row, index) => (
										<tr key={index}>
											{Object.values(row).map((value, cellIndex) => (
												<td key={cellIndex}>
													{value === null ? <em>NULL</em> : String(value)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</Table>
						</div>
					</>
				)}

				{!queryResult.isReadOnly && (
					<>
						<hr />
						<h6>Operation Result:</h6>
						<pre>{JSON.stringify(queryResult.result, null, 2)}</pre>
					</>
				)}
			</Alert>
		);
	};

	const renderSchemaTab = () => {
		if (isLoadingSchema) {
			return (
				<div className="text-center p-4">
					<Spinner animation="border" />
					<p>Loading database schema...</p>
				</div>
			);
		}

		if (!schema) {
			return (
				<Alert variant="warning">
					<p>No schema data available.</p>
					<Button onClick={loadDatabaseSchema}>Reload Schema</Button>
				</Alert>
			);
		}

		return (
			<Row>
				<Col md={4}>
					<Card>
						<Card.Header>
							<h6>Tables ({schema.tables.length})</h6>
						</Card.Header>
						<Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
							{schema.tables.map(table => (
								<div key={table.name} className="mb-2">
									<Button
										variant={selectedTable === table.name ? 'primary' : 'outline-secondary'}
										size="sm"
										className="w-100 text-start"
										onClick={() => loadTableData(table.name)}
									>
										<div className="d-flex justify-content-between align-items-center">
											<span>{table.name}</span>
											<div>
												<Badge bg="secondary" className="me-1">
													{table.type}
												</Badge>
												{table.rowCount !== undefined && (
													<Badge bg="info">
														{table.rowCount} rows
													</Badge>
												)}
											</div>
										</div>
									</Button>
								</div>
							))}
						</Card.Body>
					</Card>

				</Col>

				<Col md={8}>
					{selectedTable && (
						<Card>
							<Card.Header>
								<div className="d-flex justify-content-between align-items-center">
									<h6>Table: {selectedTable}</h6>
									<Button
										size="sm"
										variant="outline-primary"
										onClick={() => insertSampleQuery(`SELECT * FROM ${selectedTable} LIMIT 10;`)}
									>
										Query This Table
									</Button>
								</div>
							</Card.Header>
							<Card.Body>
								{isLoadingTableData ? (
									<div className="text-center p-4">
										<Spinner animation="border" size="sm" />
										<p>Loading table data...</p>
									</div>
								) : tableData ? (
									<>
										{/* Table info */}
										<Row className="mb-3">
											<Col md={6}>
												<p><strong>Columns:</strong> {tableData.columns.length}</p>
												<p><strong>Total Rows:</strong> {tableData.pagination.totalRows}</p>
											</Col>
											<Col md={6}>
												<p><strong>Page Size:</strong> {tableData.pagination.limit}</p>
												<p><strong>Current Page:</strong> {Math.floor(tableData.pagination.offset / tableData.pagination.limit) + 1}</p>
											</Col>
										</Row>

										{/* Column info */}
										<h6>Columns:</h6>
										<Table size="sm" className="mb-3">
											<thead>
												<tr>
													<th>Name</th>
													<th>Type</th>
													<th>Not Null</th>
													<th>Default</th>
													<th>Primary Key</th>
												</tr>
											</thead>
											<tbody>
												{tableData.columns.map(col => (
													<tr key={col.cid}>
														<td><strong>{col.name}</strong></td>
														<td>{col.type}</td>
														<td>{col.notnull ? 'Yes' : 'No'}</td>
														<td>{col.dflt_value || <em>None</em>}</td>
														<td>{col.pk ? 'Yes' : 'No'}</td>
													</tr>
												))}
											</tbody>
										</Table>

										{/* Data preview */}
										<h6>Data Preview:</h6>
										<div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
											<Table striped bordered hover size="sm">
												<thead>
													<tr>
														{tableData.columns.map(col => (
															<th key={col.cid}>{col.name}</th>
														))}
													</tr>
												</thead>
												<tbody>
													{tableData.data.map((row, index) => (
														<tr key={index}>
															{tableData.columns.map(col => (
																<td key={col.cid}>
																	{row[col.name] === null ? <em>NULL</em> : String(row[col.name])}
																</td>
															))}
														</tr>
													))}
												</tbody>
											</Table>
										</div>

										{/* Pagination */}
										{tableData.pagination.totalRows > tableData.pagination.limit && (
											<div className="d-flex justify-content-between align-items-center mt-3">
												<div>
													Showing {tableData.pagination.offset + 1} to {Math.min(tableData.pagination.offset + tableData.pagination.limit, tableData.pagination.totalRows)} of {tableData.pagination.totalRows} rows
												</div>
												<Pagination size="sm">
													<Pagination.Prev
														disabled={tablePage === 0}
														onClick={() => loadTableData(selectedTable, tablePage - 1)}
													/>
													<Pagination.Item active>
														{tablePage + 1}
													</Pagination.Item>
													<Pagination.Next
														disabled={!tableData.pagination.hasMore}
														onClick={() => loadTableData(selectedTable, tablePage + 1)}
													/>
												</Pagination>
											</div>
										)}
									</>
								) : (
									<p>Select a table to view its data</p>
								)}
							</Card.Body>
						</Card>
					)}
				</Col>
			</Row>
		);
	};

	return (
		<Container fluid>
			<Row className="mb-4">
				<Col>
					<h2>SQL Debug Console</h2>
					<Alert variant="warning">
						<strong>⚠️ Admin Only:</strong> This interface allows direct database access. Use with extreme caution.
						All queries are logged for security audit purposes.
					</Alert>
				</Col>
			</Row>

			<Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'query')} className="mb-4">
				<Tab eventKey="query" title="Query Console">
					<Row>
						<Col md={8}>
							<Card>
								<Card.Header>
									<div className="d-flex justify-content-between align-items-center">
										<h6>SQL Query</h6>
										<div>
											<Dropdown className="d-inline me-2">
												<Dropdown.Toggle variant="outline-secondary" size="sm">
													Sample Queries
												</Dropdown.Toggle>
												<Dropdown.Menu>
													{AdminSqlService.getSampleQueries().map(sample => (
														<Dropdown.Item
															key={sample.name}
															onClick={() => insertSampleQuery(sample.query)}
														>
															<strong>{sample.name}</strong>
															<br />
															<small className="text-muted">{sample.description}</small>
														</Dropdown.Item>
													))}
												</Dropdown.Menu>
											</Dropdown>
											<Button
												variant="primary"
												size="sm"
												onClick={handleExecuteQuery}
												disabled={isExecuting || !query.trim() || Boolean(queryValidation && queryValidation.isValid === false)}
											>
												{isExecuting ? <Spinner animation="border" size="sm" /> : 'Execute'}
											</Button>
										</div>
									</div>
								</Card.Header>
								<Card.Body>
									<Form.Group className="mb-3">
										<Form.Control
											as="textarea"
											rows={8}
											placeholder="Enter your SQL query here..."
											value={query}
											onChange={(e) => setQuery(e.target.value)}
											style={{ fontFamily: 'monospace' }}
										/>
									</Form.Group>

									<Form.Group className="mb-3">
										<Form.Label>Query Parameters (JSON array, optional)</Form.Label>
										<Form.Control
											type="text"
											placeholder='["param1", "param2"]'
											value={queryParams}
											onChange={(e) => setQueryParams(e.target.value)}
											style={{ fontFamily: 'monospace' }}
										/>
									</Form.Group>

									{queryValidation && (
										<>
											{queryValidation.errors.length > 0 && (
												<Alert variant="danger">
													<strong>Errors:</strong>
													<ul className="mb-0">
														{queryValidation.errors.map((error, index) => (
															<li key={index}>{error}</li>
														))}
													</ul>
												</Alert>
											)}
											{queryValidation.warnings.length > 0 && (
												<Alert variant="warning">
													<strong>Warnings:</strong>
													<ul className="mb-0">
														{queryValidation.warnings.map((warning, index) => (
															<li key={index}>{warning}</li>
														))}
													</ul>
												</Alert>
											)}
										</>
									)}
								</Card.Body>
							</Card>

							{renderQueryResult()}
						</Col>

						<Col md={4}>
							<Card>
								<Card.Header>
									<h6>Quick Actions</h6>
								</Card.Header>
								<Card.Body>
									<div className="d-grid gap-2">
										<Button
											variant="outline-primary"
											size="sm"
											onClick={() => setActiveTab('schema')}
										>
											Browse Schema
										</Button>
										<Button
											variant="outline-secondary"
											size="sm"
											onClick={() => setQuery('')}
										>
											Clear Query
										</Button>
										<Button
											variant="outline-info"
											size="sm"
											onClick={loadDatabaseSchema}
										>
											Refresh Schema
										</Button>
									</div>

									<hr />

									<h6>Query Tips:</h6>
									<ul className="small">
										<li>Use <code>LIMIT</code> for large result sets</li>
										<li>Parameterized queries use <code>?</code> placeholders</li>
										<li>Be careful with <code>DELETE</code> and <code>UPDATE</code></li>
										<li>Check warnings before executing</li>
									</ul>
								</Card.Body>
							</Card>
						</Col>
					</Row>
				</Tab>

				<Tab eventKey="schema" title="Database Schema">
					{renderSchemaTab()}
				</Tab>
			</Tabs>

			{/* Confirmation Modal for Dangerous Queries */}
			<Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
				<Modal.Header closeButton>
					<Modal.Title>⚠️ Confirm Query Execution</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Alert variant="warning">
						<p>This query has potential risks. Please review the warnings:</p>
						{queryValidation?.warnings.map((warning, index) => (
							<div key={index}>• {warning}</div>
						))}
					</Alert>
					<p><strong>Query to execute:</strong></p>
					<pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
						{pendingQuery}
					</pre>
					<p>Are you sure you want to proceed?</p>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
						Cancel
					</Button>
					<Button variant="danger" onClick={confirmExecuteQuery}>
						Execute Anyway
					</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	);
};
