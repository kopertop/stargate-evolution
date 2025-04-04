import React, { useState } from 'react';

const TradeScreen = () => {
	const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

	return (
		<div className="trade-screen">
			<div className="trade-header">
				<h2>Trade Routes</h2>
				<div className="trade-tabs">
					<button
						className={activeTab === 'list' ? 'active' : ''}
						onClick={() => setActiveTab('list')}
					>
						View Routes
					</button>
					<button
						className={activeTab === 'create' ? 'active' : ''}
						onClick={() => setActiveTab('create')}
					>
						Create Route
					</button>
				</div>
			</div>

			<div className="trade-content">
				{activeTab === 'list' ? (
					<div className="trade-routes-list">
						<p>Route list will appear here.</p>
						{/* TradeRoutesList component will be added here later */}
					</div>
				) : (
					<div className="trade-route-creator">
						<p>Create new trade routes here.</p>
						{/* TradeRouteCreator component will be added here later */}
					</div>
				)}
			</div>
		</div>
	);
};

export default TradeScreen;
