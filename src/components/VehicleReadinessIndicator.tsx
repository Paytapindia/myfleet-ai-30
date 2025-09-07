import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useVehicleReadiness } from '@/hooks/useVehicleReadiness';

interface VehicleReadinessIndicatorProps {
  vehicleNumber: string;
  compact?: boolean;
}

export const VehicleReadinessIndicator: React.FC<VehicleReadinessIndicatorProps> = ({ 
  vehicleNumber, 
  compact = false  
}) => {
  const { readiness, isLoading } = useVehicleReadiness(vehicleNumber);

  if (isLoading) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Checking...
      </Badge>
    );
  }

  if (readiness.isReady) {
    return compact ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3 mr-1" />
        Ready for Challans
      </Badge>
    );
  }

  if (!readiness.isRCVerified) {
    return compact ? (
      <Clock className="h-4 w-4 text-orange-500" />
    ) : (
      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
        <Clock className="h-3 w-3 mr-1" />
        RC Verification Pending
      </Badge>
    );
  }

  return compact ? (
    <AlertCircle className="h-4 w-4 text-red-500" />
  ) : (
    <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
      <AlertCircle className="h-3 w-3 mr-1" />
      Data Incomplete
    </Badge>
  );
};