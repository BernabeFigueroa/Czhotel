import React from 'react';

export type ViewMode = 'staff' | 'estela';
export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface HeaderChromeProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  currentDevice: DeviceMode;
  onDeviceChange: (device: DeviceMode) => void;
}

export const HeaderChrome: React.FC<HeaderChromeProps> = ({
  currentView,
  onViewChange,
  currentDevice,
  onDeviceChange,
}) => {
  return (
    <header className="chrome-bar">
      <div className="switch-group">
        <span className="switch-label">Vista</span>
        <div className="segmented">
          <button
            type="button"
            className={currentView === 'staff' ? 'active' : ''}
            onClick={() => onViewChange('staff')}
          >
            Personal del hotel
          </button>
          <button
            type="button"
            className={currentView === 'estela' ? 'active' : ''}
            onClick={() => onViewChange('estela')}
          >
            Estela
          </button>
        </div>
      </div>

      <div className="switch-group">
        <span className="switch-label">Ver como</span>
        <div className="segmented">
          <button
            type="button"
            className={currentDevice === 'desktop' ? 'active' : ''}
            onClick={() => onDeviceChange('desktop')}
          >
            Escritorio
          </button>
          <button
            type="button"
            className={currentDevice === 'tablet' ? 'active' : ''}
            onClick={() => onDeviceChange('tablet')}
          >
            Tablet
          </button>
          <button
            type="button"
            className={currentDevice === 'mobile' ? 'active' : ''}
            onClick={() => onDeviceChange('mobile')}
          >
            Celular
          </button>
        </div>
      </div>
    </header>
  );
};
