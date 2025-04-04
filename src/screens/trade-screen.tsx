import React, { useState } from 'react';
import TradeRouteCreator from '../components/trade-route-creator';

// Sample planet data - in a real app, this would come from game state
const samplePlanets = [
	{ id: 'earth', name: 'Earth' },
	{ id: 'abydos', name: 'Abydos' },
	{ id: 'chulak', name: 'Chulak' },
	{ id: 'dakara', name: 'Dakara' },
	{ id: 'langara', name: 'Langara' }
];

interface TradeRoute {
	id: string;
	sourcePlanetId: string;
	targetPlanetId: string;
	value: number;
}

const TradeScreen = () => {
	const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
	const [routes, setRoutes] = useState<TradeRoute[]>([]);

	const handleCreateRoute = (sourceId: string, targetId: string, value: number) => {
		const newRoute: TradeRoute = {
			id: `route-${Date.now()}`,
			sourcePlanetId: sourceId,
			targetPlanetId: targetId,
			value
		};

		setRoutes([...routes, newRoute]);
		// Switch to list view to see the new route
		setActiveTab('list');
	};

	// Find planet name by id
	const getPlanetName = (id: string): string => {
		const planet = samplePlanets.find(p => p.id === id);
		return planet ? planet.name : 'Unknown';
	};

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
						{routes.length === 0 ? (
							<p>No trade routes established yet.</p>
						) : (
							<div>
								<h3>Established Routes</h3>
								<ul className="routes-list">
									{routes.map(route => (
										<li key={route.id} className="route-item">
											<div className="route-planets">
												{getPlanetName(route.sourcePlanetId)} → {getPlanetName(route.targetPlanetId)}
											</div>
											<div className="route-value">Value: {route.value}</div>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				) : (
					<TradeRouteCreator
						planets={samplePlanets}
						onCreateRoute={handleCreateRoute}
					/>
				)}
			</div>
		</div>
	);
};

export default TradeScreen;
