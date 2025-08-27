import { useState } from "react";
import { Car, Loader2, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { fetchVehicleDetails, VehicleApiResponse } from "@/services/vehicleApi";

interface VehicleDetailsPopoverProps {
  vehicleNumber: string;
}

const VehicleDetailsPopover = ({ vehicleNumber }: VehicleDetailsPopoverProps) => {
  const [vehicleDetails, setVehicleDetails] = useState<VehicleApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleFetchDetails = async () => {
    if (vehicleDetails || isLoading) return; // Don't fetch if already loaded or loading
    
    setIsLoading(true);
    setError(null);
    
    try {
      const details = await fetchVehicleDetails(vehicleNumber);
      setVehicleDetails(details);
      
      if (!details.success) {
        setError(details.error || 'Failed to fetch vehicle details');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      handleFetchDetails();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-xl hover:bg-primary/10 transition-all duration-200"
        >
          <Car className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="bottom">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Car className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <h3 className="font-semibold text-foreground">Vehicle Details</h3>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading vehicle details...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 py-4 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {vehicleDetails && vehicleDetails.success && !isLoading && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Vehicle Number</p>
                  <p className="text-sm font-semibold text-foreground">{vehicleDetails.number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Model</p>
                  <p className="text-sm font-semibold text-foreground">{vehicleDetails.model}</p>
                </div>
              </div>
              
              {vehicleDetails.make && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Make</p>
                    <p className="text-sm font-semibold text-foreground">{vehicleDetails.make}</p>
                  </div>
                  {vehicleDetails.year && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Year</p>
                      <p className="text-sm font-semibold text-foreground">{vehicleDetails.year}</p>
                    </div>
                  )}
                </div>
              )}

              {vehicleDetails.fuelType && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Fuel Type</p>
                  <p className="text-sm font-semibold text-foreground">{vehicleDetails.fuelType}</p>
                </div>
              )}

              {vehicleDetails.registrationDate && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Registration Date</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(vehicleDetails.registrationDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VehicleDetailsPopover;