import React from 'react';
import { LogPhotoFlow } from './LogPhotoFlow';

interface LogPhotoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogPhotoIntakeModal: React.FC<LogPhotoIntakeModalProps> = ({
  isOpen,
  onClose
}) => {
  return (
    <LogPhotoFlow
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};