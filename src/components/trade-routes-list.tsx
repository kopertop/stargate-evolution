import React, { useState, useEffect } from 'react';

interface TradeRoute {
	id: string;
	sourcePlanetId: string;
	targetPlanetId: string;
	value: number;
}

interface Planet {
	id: string;
	name: string;
}

interface TradeRoutesListProps {
	planets?: Planet[];
	onEditRoute?: (route: TradeRoute) => void;
	onDeleteRoute?: (routeId: string) => void;
}

export default function TradeRoutesList({ planets = [], onEditRoute, onDeleteRoute }: TradeRoutesListProps) {
	const [tradeRoutes, setTradeRoutes] = useState<TradeRoute[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Get planet name by id
	const getPlanetName = (planetId: string): string => {
		const planet = planets.find(p => p.id === planetId);
		return planet ? planet.name : 'Unknown Planet';
	};

	// Load trade routes on component mount
	useEffect(() => {
		// In a real app, this would fetch from your game state
		// For demo purposes, we're just setting a timeout to simulate API fetch
		const fetchRoutes = () => {
			setIsLoading(true);

			// Simulate network delay
			setTimeout(() => {
				// Sample data - replace with actual data in real implementation
				const sampleRoutes: TradeRoute[] = [
					{
						id: 'route1',
						sourcePlanetId: 'earth',
						targetPlanetId: 'abydos',
						value: 5
					},
					{
						id: 'route2',
						sourcePlanetId: 'chulak',
						targetPlanetId: 'dakara',
						value: 3
					}
				];

				setTradeRoutes(sampleRoutes);
				setIsLoading(false);
			}, 1000);
		};

		fetchRoutes();
	}, []);

	// Handle route deletion
	const handleDeleteRoute = (routeId: string) => {
		if (window.confirm('Are you sure you want to delete this trade route?')) {
			// Call the provided delete handler if it exists
			if (onDeleteRoute) {
				onDeleteRoute(routeId);
			}

			// Update local state
			setTradeRoutes(tradeRoutes.filter(route => route.id !== routeId));
		}
	};

	// Handle edit route
	const handleEditRoute = (route: TradeRoute) => {
		if (onEditRoute) {
			onEditRoute(route);
		}
	};

	if (isLoading) {
		return (
			<div className="trade-routes-loading">
				<p>Loading trade routes...</p>
			</div>
		);
	}

	if (tradeRoutes.length === 0) {
		return (
			<div className="trade-routes-empty">
				<p>No trade routes have been established yet.</p>
			</div>
		);
	}

	return (
		<div className="trade-routes-container">
			<h3>Established Trade Routes</h3>

			<ul className="routes-list">
				{tradeRoutes.map(route => (
					<li key={route.id} className="route-item">
						<div className="route-info">
							<div className="route-planets">
								{getPlanetName(route.sourcePlanetId)} → {getPlanetName(route.targetPlanetId)}
							</div>
							<div className="route-value">Value: {route.value}</div>
						</div>

						<div className="route-actions">
							<button
								className="edit-button"
								onClick={() => handleEditRoute(route)}
							>
								Edit
							</button>
							<button
								className="delete-button"
								onClick={() => handleDeleteRoute(route.id)}
							>
								Delete
							</button>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
