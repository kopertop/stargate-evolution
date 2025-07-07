import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'react-toastify';
import { isMobileDevice } from '../utils/mobile-utils';

interface MobileGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  message?: string;
}

/**
 * Component that blocks mobile access to certain routes
 */
export const MobileGuard: React.FC<MobileGuardProps> = ({ 
  children, 
  redirectTo = '/', 
  message = 'This page is not available on mobile devices' 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (isMobileDevice()) {
      toast.error(message);
      navigate(redirectTo, { replace: true });
    }
  }, [location.pathname, message, navigate, redirectTo]);
  
  // Don't render content on mobile
  if (isMobileDevice()) {
    return null;
  }
  
  return <>{children}</>;
};