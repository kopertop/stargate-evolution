import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';

// Import package.json to get frontend version
import packageJson from '../../package.json';

interface ApiStatus {
  status: string;
  version: string;
  name: string;
  timestamp: string;
  environment?: string;
}

interface VersionInfoProps {
  className?: string;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ className = '' }) => {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const response = await apiClient.get('/api/status', false); // false = unauthenticated
        if (response.data) {
          setApiStatus(response.data);
        } else {
          setError(response.error || 'Failed to fetch API status');
        }
      } catch (err) {
        setError('Unable to connect to API');
        console.warn('Failed to fetch API status:', err);
      }
    };

    fetchApiStatus();
  }, []);

  return (
    <div className={`version-info text-muted small ${className}`}>
      <div>Frontend: v{packageJson.version}</div>
      {apiStatus ? (
        <div>Backend: v{apiStatus.version}</div>
      ) : error ? (
        <div>Backend: {error}</div>
      ) : (
        <div>Backend: Loading...</div>
      )}
    </div>
  );
};