import React from 'react';
import { Container, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  FaBolt, 
  FaShieldAlt, 
  FaHeart, 
  FaTint, 
  FaUtensils, 
  FaCog, 
  FaMedkit,
  FaClock,
  FaRocket,
  FaUsers,
  FaCloud,
  FaLeaf
} from 'react-icons/fa';

interface ResourceBarProps {
  power: number;
  maxPower: number;
  shields: number;
  maxShields: number;
  hull: number;
  maxHull: number;
  water: number;
  maxWater: number;
  food: number;
  maxFood: number;
  spareParts: number;
  maxSpareParts: number;
  medicalSupplies: number;
  maxMedicalSupplies: number;
  co2: number;
  o2: number;
  gameDays: number;
  gameHours: number;
  ftlStatus: string;
  nextFtlTransition: number;
  characterCount: number;
}

interface ResourceItemProps {
  icon: React.ReactNode;
  current: number;
  max?: number;
  label: string;
  color: string;
  format?: 'percentage' | 'number' | 'time';
}

const ResourceItem: React.FC<ResourceItemProps> = ({ 
  icon, 
  current, 
  max, 
  label, 
  color, 
  format = 'number' 
}) => {
  const getDisplayValue = () => {
    if (format === 'percentage' && max) {
      return `${Math.round((current / max) * 100)}%`;
    }
    if (format === 'time') {
      const days = Math.floor(current / 24);
      const hours = current % 24;
      return `${days}d ${hours}h`;
    }
    if (max) {
      return `${current}/${max}`;
    }
    return current.toString();
  };

  const getColorStyle = () => {
    if (max && format === 'percentage') {
      const percentage = (current / max) * 100;
      if (percentage < 25) return '#dc3545'; // danger
      if (percentage < 50) return '#fd7e14'; // warning
      return color;
    }
    return color;
  };

  const getTooltipContent = () => {
    if (format === 'percentage' && max) {
      const percentage = Math.round((current / max) * 100);
      return `${label}: ${current}/${max} (${percentage}%)`;
    }
    if (format === 'time') {
      const days = Math.floor(current / 24);
      const hours = current % 24;
      return `${label}: Day ${days}, Hour ${hours}`;
    }
    if (max) {
      return `${label}: ${current} of ${max} available`;
    }
    return `${label}: ${current}`;
  };

  const tooltip = (
    <Tooltip id={`tooltip-${label.replace(/\s+/g, '-').toLowerCase()}`}>
      {getTooltipContent()}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: 250, hide: 150 }}
      overlay={tooltip}
    >
      <div 
        className="d-flex align-items-center me-3" 
        style={{ fontSize: '0.9rem', cursor: 'help' }}
      >
        <span style={{ color: getColorStyle(), marginRight: '4px' }}>
          {icon}
        </span>
        <span style={{ color: getColorStyle(), fontWeight: '500' }}>
          {getDisplayValue()}
        </span>
      </div>
    </OverlayTrigger>
  );
};

export const ResourceBar: React.FC<ResourceBarProps> = ({
  power,
  maxPower,
  shields,
  maxShields,
  hull,
  maxHull,
  water,
  maxWater,
  food,
  maxFood,
  spareParts,
  maxSpareParts,
  medicalSupplies,
  maxMedicalSupplies,
  co2,
  o2,
  gameDays,
  gameHours,
  ftlStatus,
  nextFtlTransition,
  characterCount
}) => {
  const totalTime = gameDays * 24 + gameHours;

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 16px',
        zIndex: 1000,
        color: 'white'
      }}
    >
      <Container fluid>
        <Row className="align-items-center">
          <Col xs="auto">
            <div className="d-flex align-items-center flex-wrap">
              {/* Power & Critical Systems */}
              <ResourceItem
                icon={<FaBolt />}
                current={power}
                max={maxPower}
                label="Power"
                color="#ffc107"
                format="percentage"
              />
              
              <ResourceItem
                icon={<FaShieldAlt />}
                current={shields}
                max={maxShields}
                label="Shields"
                color="#17a2b8"
                format="percentage"
              />
              
              <ResourceItem
                icon={<FaHeart />}
                current={hull}
                max={maxHull}
                label="Hull Integrity"
                color="#dc3545"
                format="percentage"
              />
              
              {/* Life Support */}
              <ResourceItem
                icon={<FaLeaf />}
                current={o2}
                label="Oxygen"
                color="#28a745"
              />
              
              <ResourceItem
                icon={<FaCloud />}
                current={co2}
                label="CO2"
                color="#6c757d"
              />
              
              {/* Resources */}
              <ResourceItem
                icon={<FaTint />}
                current={water}
                max={maxWater}
                label="Water"
                color="#17a2b8"
                format="percentage"
              />
              
              <ResourceItem
                icon={<FaUtensils />}
                current={food}
                max={maxFood}
                label="Food"
                color="#fd7e14"
                format="percentage"
              />
              
              <ResourceItem
                icon={<FaCog />}
                current={spareParts}
                max={maxSpareParts}
                label="Spare Parts"
                color="#6c757d"
                format="percentage"
              />
              
              <ResourceItem
                icon={<FaMedkit />}
                current={medicalSupplies}
                max={maxMedicalSupplies}
                label="Medical Supplies"
                color="#dc3545"
                format="percentage"
              />
            </div>
          </Col>
          
          <Col xs="auto" className="ms-auto">
            <div className="d-flex align-items-center">
              {/* Crew */}
              <ResourceItem
                icon={<FaUsers />}
                current={characterCount}
                label="Crew"
                color="#6f42c1"
              />
              
              {/* Time */}
              <ResourceItem
                icon={<FaClock />}
                current={totalTime}
                label="Mission Time"
                color="#20c997"
                format="time"
              />
              
              {/* FTL Status */}
              <div 
                className="d-flex align-items-center" 
                style={{ fontSize: '0.9rem' }}
                title={`FTL Status: ${ftlStatus === 'ftl' ? 'In Hyperspace' : 'Normal Space'}`}
              >
                <span style={{ 
                  color: ftlStatus === 'ftl' ? '#007bff' : '#28a745', 
                  marginRight: '4px' 
                }}>
                  <FaRocket />
                </span>
                <span style={{ 
                  color: ftlStatus === 'ftl' ? '#007bff' : '#28a745', 
                  fontWeight: '500' 
                }}>
                  {ftlStatus === 'ftl' ? 'FTL' : 'NORM'}
                </span>
                {ftlStatus === 'ftl' && nextFtlTransition > 0 && (
                  <span style={{ color: '#6c757d', marginLeft: '4px', fontSize: '0.8rem' }}>
                    {nextFtlTransition}h
                  </span>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};