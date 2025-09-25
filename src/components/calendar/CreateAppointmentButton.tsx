import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CreateAppointmentButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CreateAppointmentButton: React.FC<CreateAppointmentButtonProps> = ({
  onClick,
  disabled = false
}) => {
  return (
    <Button 
      onClick={onClick}
      disabled={disabled}
      size="sm"
      className="bg-primary hover:bg-primary/90"
    >
      <Plus className="h-4 w-4 mr-2" />
      Schedule Appointment
    </Button>
  );
};