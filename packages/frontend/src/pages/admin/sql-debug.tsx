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
	InputGroup,
} from 'react-bootstrap';
import { toast } from 'react-toastify';

import { JsonDisplay } from '../../components/json-display';
import { AdminSqlService, SqlQueryResult, DatabaseSchema, TableData } from '../../services/admin-sql-service';

export const SqlDebugPage: React.FC = () => {
	// Query execution state
	const [query, setQuery] = useState('');
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

	// Import/Export state
	const [showImportModal, setShowImportModal] = useState(false);
	const [importTableName, setImportTableName] = useState('');
	const [importData, setImportData] = useState('');
	const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

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
			const result = await AdminSqlService.executeQuery(queryToExecute, []);
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

	const handleExportTable = async (tableName: string) => {
		setIsExporting(true);
		try {
			const data = await AdminSqlService.exportTableData(tableName);

			// Create and download JSON file
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast.success(`Exported ${data.length} rows from ${tableName}`);
		} catch (error) {
			console.error('[SQL-DEBUG] Export failed:', error);
			toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportTable = async () => {
		if (!importTableName || !importData.trim()) {
			toast.error('Please select a table and provide JSON data');
			return;
		}

		setIsImporting(true);
		try {
			const parsedData = JSON.parse(importData);
			if (!Array.isArray(parsedData)) {
				throw new Error('JSON data must be an array of objects');
			}

			const result = await AdminSqlService.importTableData(importTableName, parsedData, importMode);

			if (result.success) {
				toast.success(`${result.message}. Rows affected: ${result.rowsAffected}`);
				setShowImportModal(false);
				setImportData('');

				// Refresh table data if currently viewing the imported table
				if (selectedTable === importTableName) {
					loadTableData(importTableName, 0);
				}
			} else {
				throw new Error(result.message);
			}
		} catch (error) {
			console.error('[SQL-DEBUG] Import failed:', error);
			if (error instanceof SyntaxError) {
				toast.error('Invalid JSON format. Please check your data.');
			} else {
				toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		} finally {
			setIsImporting(false);
		}
	};

	const openImportModal = (tableName: string) => {
		setImportTableName(tableName);
		setShowImportModal(true);
	};

	const renderQueryResult = () => {
		if (!queryResult) {
			return (
				<div className="d-flex align-items-center justify-content-center" style={{ height: '200px', color: '#6c757d' }}>
					<div className="text-center">
						<h5>No Query Executed</h5>
						<p>Enter a SQL query below and press Execute or <kbd>Cmd+Enter</kbd></p>
					</div>
				</div>
			);
		}

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

		const formatCellValue = (value: any) => {
			return <JsonDisplay value={value} maxPreviewLength={50} />;
		};

		return (
			<>
				{/* Query metadata */}
				<div className="d-flex justify-content-between align-items-center mb-3">
					<div>
						<Badge bg={queryResult.isReadOnly ? 'success' : 'warning'} className="me-2">
							{queryResult.isReadOnly ? 'Read-only' : 'Write operation'}
						</Badge>
						<span className="text-muted">
							{queryResult.isReadOnly ?
								`${Array.isArray(queryResult.result) ? queryResult.result.length : 0} rows returned` :
								`${queryResult.affectedRows} rows affected`
							}
						</span>
					</div>
					<small className="text-muted">
						Executed by {queryResult.executedBy} at {new Date(queryResult.executedAt).toLocaleString()}
					</small>
				</div>

				{queryResult.isReadOnly && Array.isArray(queryResult.result) && queryResult.result.length > 0 ? (
					<div
						style={{
							height: '100%',
							overflowY: 'auto',
							overflowX: 'auto',
							border: '1px solid #dee2e6',
							borderRadius: '0.375rem',
							backgroundColor: '#fff',
						}}
					>
						<Table striped bordered hover size="sm" className="mb-0">
							<thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
								<tr>
									{Object.keys(queryResult.result[0]).map(key => (
										<th key={key} style={{ minWidth: '120px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
											{key}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{queryResult.result.map((row, index) => (
									<tr key={index}>
										{Object.entries(row).map(([key, value], cellIndex) => (
											<td key={cellIndex} style={{ maxWidth: '300px', verticalAlign: 'top' }}>
												{formatCellValue(value)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</Table>
					</div>
				) : !queryResult.isReadOnly ? (
					<div
						style={{
							backgroundColor: '#f8f9fa',
							padding: '1rem',
							borderRadius: '0.375rem',
							border: '1px solid #dee2e6',
							height: '100%',
							overflowY: 'auto',
						}}
					>
						<h6>Operation Result:</h6>
						<pre style={{ margin: 0, fontSize: '0.875rem' }}>
							{JSON.stringify(queryResult.result, null, 2)}
						</pre>
					</div>
				) : (
					<div className="d-flex align-items-center justify-content-center" style={{ height: '200px', color: '#6c757d' }}>
						<div className="text-center">
							<h6>No Results</h6>
							<p>Query executed successfully but returned no data</p>
						</div>
					</div>
				)}
			</>
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
			<Row style={{ height: 'calc(100vh - 300px)' }}>
				<Col md={4} style={{ height: '100%' }}>
					<Card style={{ height: '100%' }}>
						<Card.Header>
							<h6>Tables ({schema.tables.length})</h6>
						</Card.Header>
						<Card.Body
							style={{
								height: 'calc(100% - 60px)',
								overflowY: 'auto',
								padding: '0.75rem',
							}}
						>
							{schema.tables.map(table => (
								<div key={table.name} className="mb-2">
									<Button
										variant={selectedTable === table.name ? 'primary' : 'outline-secondary'}
										size="sm"
										className="w-100 text-start"
										onClick={() => loadTableData(table.name)}
									>
										<div className="d-flex justify-content-between align-items-center">
											<span style={{ fontFamily: 'monospace' }}>{table.name}</span>
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

				<Col md={8} style={{ height: '100%' }}>
					{selectedTable && (
						<Card style={{ height: '100%' }}>
							<Card.Header>
								<div className="d-flex justify-content-between align-items-center">
									<h6>Table: <code>{selectedTable}</code></h6>
									<div className="d-flex gap-2">
										<Button
											size="sm"
											variant="outline-success"
											onClick={() => handleExportTable(selectedTable)}
											disabled={isExporting}
											title="Export table data as JSON"
										>
											{isExporting ? <Spinner animation="border" size="sm" /> : '📤 Export'}
										</Button>
										<Button
											size="sm"
											variant="outline-warning"
											onClick={() => openImportModal(selectedTable)}
											title="Import JSON data to table"
										>
											📥 Import
										</Button>
										<Button
											size="sm"
											variant="outline-primary"
											onClick={() => insertSampleQuery(`SELECT * FROM ${selectedTable} LIMIT 10;`)}
										>
											Query This Table
										</Button>
									</div>
								</div>
							</Card.Header>
							<Card.Body
								style={{
									height: 'calc(100% - 60px)',
									overflowY: 'auto',
									padding: '1rem',
								}}
							>
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
												<p><strong>Current Page:</strong> {tableData.pagination.page}</p>
											</Col>
										</Row>

										{/* Column info */}
										<h6>Columns:</h6>
										<div
											style={{
												maxHeight: '200px',
												overflowY: 'auto',
												marginBottom: '1rem',
												border: '1px solid #dee2e6',
												borderRadius: '0.375rem',
											}}
										>
											<Table size="sm" className="mb-0">
												<thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa' }}>
													<tr>
														<th>Name</th>
														<th>Type</th>
														<th>Not Null</th>
														<th>Default</th>
														<th>Primary Key</th>
													</tr>
												</thead>
												<tbody>
													{tableData.columns.map((col, colIndex) => (
														<tr key={`col-${col.cid ?? colIndex}-${col.name}`}>
															<td><code>{col.name}</code></td>
															<td>{col.type}</td>
															<td>{col.notnull ? 'Yes' : 'No'}</td>
															<td>{col.dflt_value ? <JsonDisplay value={col.dflt_value} maxPreviewLength={30} /> : <em className="text-muted">None</em>}</td>
															<td>{col.pk ? 'Yes' : 'No'}</td>
														</tr>
													))}
												</tbody>
											</Table>
										</div>

										{/* Data preview */}
										<div className="d-flex justify-content-between align-items-center mb-2">
											<h6>Data Preview:</h6>
											{tableData.pagination.totalRows > tableData.pagination.limit && (
												<small className="text-muted">
													Showing {((tableData.pagination.page - 1) * tableData.pagination.limit) + 1} to {Math.min(tableData.pagination.page * tableData.pagination.limit, tableData.pagination.totalRows)} of {tableData.pagination.totalRows} rows
												</small>
											)}
										</div>
										<div
											style={{
												maxHeight: '400px',
												overflowY: 'auto',
												overflowX: 'auto',
												border: '1px solid #dee2e6',
												borderRadius: '0.375rem',
												backgroundColor: '#fff',
											}}
										>
											<Table striped bordered hover size="sm" className="mb-0">
												<thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
													<tr>
														{tableData.columns.map((col, colIndex) => (
															<th key={`header-${col.cid ?? colIndex}-${col.name}`} style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>
																<code>{col.name}</code>
															</th>
														))}
													</tr>
												</thead>
												<tbody>
													{tableData.data.map((row, index) => (
														<tr key={`row-${index}`}>
															{tableData.columns.map((col, colIndex) => (
																<td key={`cell-${index}-${col.cid ?? colIndex}-${col.name}`} style={{ maxWidth: '200px', wordBreak: 'break-word' }}>
																	<JsonDisplay value={row[col.name]} maxPreviewLength={40} />
																</td>
															))}
														</tr>
													))}
												</tbody>
											</Table>
										</div>

										{/* Pagination */}
										{tableData.pagination.totalRows > tableData.pagination.limit && (
											<div className="d-flex justify-content-center mt-3">
												<Pagination size="sm">
													<Pagination.First
														disabled={tablePage === 0}
														onClick={() => loadTableData(selectedTable, 0)}
													/>
													<Pagination.Prev
														disabled={tablePage === 0}
														onClick={() => loadTableData(selectedTable, tablePage - 1)}
													/>

													{/* Show page numbers around current page */}
													{Array.from({ length: Math.min(5, tableData.pagination.totalPages) }, (_, i) => {
														const pageNum = Math.max(0, Math.min(tablePage - 2 + i, tableData.pagination.totalPages - 1));
														return (
															<Pagination.Item
																key={pageNum}
																active={pageNum === tablePage}
																onClick={() => loadTableData(selectedTable, pageNum)}
															>
																{pageNum + 1}
															</Pagination.Item>
														);
													})}

													<Pagination.Next
														disabled={!tableData.pagination.hasNext}
														onClick={() => loadTableData(selectedTable, tablePage + 1)}
													/>
													<Pagination.Last
														disabled={!tableData.pagination.hasNext}
														onClick={() => loadTableData(selectedTable, tableData.pagination.totalPages - 1)}
													/>
												</Pagination>
											</div>
										)}
									</>
								) : (
									<p className="text-center text-muted p-4">Select a table to view its data</p>
								)}
							</Card.Body>
						</Card>
					)}
				</Col>
			</Row>
		);
	};

	return (
		<Container fluid style={{ height: '100vh', paddingTop: '1rem', paddingBottom: '1rem' }}>
			<Row className="mb-3">
				<Col>
					<h2>SQL Debug Console</h2>
					<Alert variant="warning">
						<strong>⚠️ Admin Only:</strong> This interface allows direct database access. Use with extreme caution.
						All queries are logged for security audit purposes.
					</Alert>
				</Col>
			</Row>

			<div style={{ height: 'calc(100vh - 200px)' }}>
				<Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'query')} className="mb-3">
					<Tab eventKey="query" title="Query Console">
						<div style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
							{/* Results Section - Top */}
							<div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
								{renderQueryResult()}
							</div>

							{/* Query Input Section - Bottom */}
							<Card className="flex-shrink-0">
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
												variant="outline-secondary"
												size="sm"
												onClick={() => setQuery('')}
											>
												Clear
											</Button>
										</div>
									</div>
								</Card.Header>
								<Card.Body>
									<InputGroup>
										<Form.Control
											as="textarea"
											rows={1}
											placeholder="Enter your SQL query here..."
											value={query}
											onChange={(e) => setQuery(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
													e.preventDefault();
													if (!isExecuting && query.trim() && !(queryValidation && queryValidation.isValid === false)) {
														handleExecuteQuery();
													}
												}
											}}
											style={{
												fontFamily: 'monospace',
												fontSize: '0.875rem',
												minHeight: '42px',
												resize: 'vertical',
											}}
										/>
										<Button
											variant="primary"
											onClick={handleExecuteQuery}
											disabled={isExecuting || !query.trim() || Boolean(queryValidation && queryValidation.isValid === false)}
											style={{ minWidth: '120px' }}
										>
											{isExecuting ? (
												<Spinner animation="border" size="sm" />
											) : (
												<>
													Execute{' '}
													<small className="text-light">
														<kbd style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
															⌘↩
														</kbd>
													</small>
												</>
											)}
										</Button>
									</InputGroup>

									{queryValidation && (
										<div className="mt-2">
											{queryValidation.errors.length > 0 && (
												<Alert variant="danger" className="py-2 mb-2">
													<strong>Errors:</strong>
													{queryValidation.errors.map((error, index) => (
														<div key={index} className="small">• {error}</div>
													))}
												</Alert>
											)}
											{queryValidation.warnings.length > 0 && (
												<Alert variant="warning" className="py-2 mb-0">
													<strong>Warnings:</strong>
													{queryValidation.warnings.map((warning, index) => (
														<div key={index} className="small">• {warning}</div>
													))}
												</Alert>
											)}
										</div>
									)}
								</Card.Body>
							</Card>
						</div>
					</Tab>

					<Tab eventKey="schema" title="Database Schema">
						{renderSchemaTab()}
					</Tab>
				</Tabs>
			</div>

			{/* Import Modal */}
			<Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg" centered>
				<Modal.Header closeButton>
					<Modal.Title>Import Data to Table: <code>{importTableName}</code></Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Alert variant="warning">
						<strong>⚠️ Warning:</strong> This operation will modify table data. Make sure to export a backup first.
					</Alert>

					<Form.Group className="mb-3">
						<Form.Label>Import Mode</Form.Label>
						<div>
							<Form.Check
								type="radio"
								name="importMode"
								label="Replace all data (DELETE existing data first)"
								value="replace"
								checked={importMode === 'replace'}
								onChange={(e) => setImportMode('replace')}
								className="mb-1"
							/>
							<Form.Check
								type="radio"
								name="importMode"
								label="Append to existing data (INSERT new data)"
								value="append"
								checked={importMode === 'append'}
								onChange={(e) => setImportMode('append')}
							/>
						</div>
					</Form.Group>

					<Form.Group className="mb-3">
						<Form.Label>JSON Data (Array of Objects)</Form.Label>
						<Form.Control
							as="textarea"
							rows={12}
							placeholder={`[
  {
    "column1": "value1",
    "column2": "value2"
  },
  {
    "column1": "value3",
    "column2": "value4"
  }
]`}
							value={importData}
							onChange={(e) => setImportData(e.target.value)}
							style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
						/>
						<Form.Text className="text-muted">
							Paste JSON array of objects. Each object should match the table&apos;s column structure.
						</Form.Text>
					</Form.Group>

					<div className="d-flex gap-2">
						<Button
							variant="outline-secondary"
							size="sm"
							onClick={() => {
								const input = document.createElement('input');
								input.type = 'file';
								input.accept = '.json';
								input.onchange = (e) => {
									const file = (e.target as HTMLInputElement).files?.[0];
									if (file) {
										const reader = new FileReader();
										reader.onload = (e) => {
											setImportData(e.target?.result as string || '');
										};
										reader.readAsText(file);
									}
								};
								input.click();
							}}
						>
							📁 Load from File
						</Button>
						<Button
							variant="outline-info"
							size="sm"
							onClick={() => handleExportTable(importTableName)}
							disabled={isExporting}
						>
							{isExporting ? <Spinner animation="border" size="sm" /> : '📤 Export Current Data'}
						</Button>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowImportModal(false)}>
						Cancel
					</Button>
					<Button
						variant={importMode === 'replace' ? 'danger' : 'warning'}
						onClick={handleImportTable}
						disabled={isImporting || !importData.trim()}
					>
						{isImporting ? <Spinner animation="border" size="sm" /> : `${importMode === 'replace' ? 'Replace' : 'Append'} Data`}
					</Button>
				</Modal.Footer>
			</Modal>

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
					<div
						style={{
							background: '#f8f9fa',
							padding: '10px',
							borderRadius: '4px',
							maxHeight: '200px',
							overflowY: 'auto',
							fontFamily: 'monospace',
							fontSize: '0.875rem',
						}}
					>
						{pendingQuery}
					</div>
					<p className="mt-3">Are you sure you want to proceed?</p>
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
