import { useState } from 'react';

interface Planet {
	id: string;
	name: string;
}

interface TradeRouteCreatorProps {
	onCreateRoute: (sourceId: string, targetId: string, value: number) => void;
	planets: Planet[];
}

export default function TradeRouteCreator({ onCreateRoute, planets }: TradeRouteCreatorProps) {
	const [sourcePlanet, setSourcePlanet] = useState('');
	const [targetPlanet, setTargetPlanet] = useState('');
	const [routeValue, setRouteValue] = useState(1);

	const handleCreateRoute = () => {
		if (sourcePlanet && targetPlanet) {
			onCreateRoute(sourcePlanet, targetPlanet, routeValue);
			// Reset form
			setSourcePlanet('');
			setTargetPlanet('');
			setRouteValue(1);
		}
	};

	return (
		<div className="trade-route-creator">
			<h3>Create New Trade Route</h3>

			<div className="form-group">
				<label htmlFor="source">Source Planet:</label>
				<select
					id="source"
					value={sourcePlanet}
					onChange={(e) => setSourcePlanet(e.target.value)}
				>
					<option value="">Select source planet</option>
					{planets.map((planet) => (
						<option key={planet.id} value={planet.id}>
							{planet.name}
						</option>
					))}
				</select>
			</div>

			<div className="form-group">
				<label htmlFor="target">Target Planet:</label>
				<select
					id="target"
					value={targetPlanet}
					onChange={(e) => setTargetPlanet(e.target.value)}
				>
					<option value="">Select target planet</option>
					{planets.map((planet) => (
						<option key={planet.id} value={planet.id}>
							{planet.name}
						</option>
					))}
				</select>
			</div>

			<div className="form-group">
				<label htmlFor="value">Route Value:</label>
				<input
					id="value"
					type="number"
					min="1"
					max="10"
					value={routeValue}
					onChange={(e) => setRouteValue(Number(e.target.value))}
				/>
			</div>

			<button
				className="create-button"
				onClick={handleCreateRoute}
				disabled={!sourcePlanet || !targetPlanet || sourcePlanet === targetPlanet}
			>
				Create Route
			</button>
		</div>
	);
}
