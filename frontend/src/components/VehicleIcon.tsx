import React from 'react';
import { VehicleType } from '../types';

interface VehicleIconProps {
  type?: VehicleType | string;
  size?: number;
  className?: string;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({
  type = 'AUTO',
  size = 22,
  className = '',
}) => {
  const normalized = (type || 'AUTO').toUpperCase();

  if (normalized === 'MOTO') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6h2l3 6.5" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h2.5" />
        <path d="M9 11l-3.5 6.5" />
      </svg>
    );
  }

  if (normalized === 'DIDI') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M14 16H9m10 0h2a1 1 0 0 0 1-1v-2.5a2 2 0 0 0-.6-1.4l-2.4-2.4A2 2 0 0 0 17.6 8H6.4a2 2 0 0 0-1.4.7L2.6 11.1A2 2 0 0 0 2 12.5V15a1 1 0 0 0 1 1h2" />
        <circle cx="7" cy="16" r="2" />
        <circle cx="16" cy="16" r="2" />
        <path d="M12 2v4m-3-2h6" strokeWidth="2.2" />
      </svg>
    );
  }

  // AUTO por defecto
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
};
