import React from 'react';
import { Link, LinkProps } from 'react-router';
import { isPWAMode } from '../utils/mobile-utils';

interface PWALinkProps extends LinkProps {
  children: React.ReactNode;
}

/**
 * Enhanced Link component that ensures PWA navigation stays within the app
 */
export const PWALink: React.FC<PWALinkProps> = ({ children, ...props }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If we're in PWA mode and this is an external link, handle specially
    if (isPWAMode() && props.to && typeof props.to === 'string') {
      // For external links (starting with http), prevent default and open in new context
      if (props.to.startsWith('http')) {
        e.preventDefault();
        window.open(props.to, '_blank');
        return;
      }
    }
    
    // Call the original onClick if provided
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
};