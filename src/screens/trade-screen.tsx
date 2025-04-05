import React, { useState } from 'react';
import TradeRouteCreator from '../components/trade-route-creator';
import TradeRoutesList from '../components/trade-routes-list';

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
	const [editingRoute, setEditingRoute] = useState<TradeRoute | null>(null);

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

	const handleEditRoute = (route: TradeRoute) => {
		setEditingRoute(route);
		setActiveTab('create');
	};

	const handleDeleteRoute = (routeId: string) => {
		setRoutes(routes.filter(route => route.id !== routeId));
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
					<TradeRoutesList
						planets={samplePlanets}
						onEditRoute={handleEditRoute}
						onDeleteRoute={handleDeleteRoute}
					/>
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
