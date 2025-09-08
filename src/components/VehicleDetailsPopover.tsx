import { useState } from "react";
import { Car, Loader2, AlertCircle, RefreshCw } from "lucide-react";
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
      console.log('🚗 [VehicleDetailsPopover] Fetching details for:', vehicleNumber);
      const details = await fetchVehicleDetails(vehicleNumber);
      console.log('🚗 [VehicleDetailsPopover] Received details:', details);
      console.log('🚗 [VehicleDetailsPopover] Success status:', details.success);
      console.log('🚗 [VehicleDetailsPopover] Model field:', details.model);
      
      setVehicleDetails(details);
      
      if (!details.success) {
        console.log('🚗 [VehicleDetailsPopover] API call failed:', details.error);
        setError(details.error || 'Failed to fetch vehicle details');
      } else {
        console.log('🚗 [VehicleDetailsPopover] API call successful, should show data');
      }
    } catch (err) {
      console.error('🚗 [VehicleDetailsPopover] Network error:', err);
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

const handleOpenChange = (open: boolean) => {
  setIsOpen(open);
  if (open) {
    // Allow a fresh fetch each time it's opened
    setVehicleDetails(null);
    handleFetchDetails();
  }
};

const handleRetry = async () => {
  setVehicleDetails(null);
  setError(null);
  await handleFetchDetails();
};

const handleRefresh = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    console.log('🚗 [VehicleDetailsPopover] Force refreshing details for:', vehicleNumber);
    const details = await fetchVehicleDetails(vehicleNumber, true); // forceRefresh = true
    setVehicleDetails(details);
    
    if (!details.success) {
      setError(details.error || 'Failed to fetch vehicle details');
    }
  } catch (err) {
    console.error('🚗 [VehicleDetailsPopover] Refresh error:', err);
    setError('Network error occurred');
  } finally {
    setIsLoading(false);
  }
};
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-auto p-2 rounded-xl hover:bg-primary/10 transition-all duration-200 flex flex-col items-center space-y-1"
        >
          <Car className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <span className="text-xs text-primary font-medium">VIEW DETAILS</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="bottom">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h3 className="font-semibold text-foreground">Vehicle Details</h3>
            </div>
            {vehicleDetails && vehicleDetails.success && !isLoading && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading vehicle details...</span>
            </div>
          )}

{error && (
  <div className="flex items-center justify-between py-4">
    <div className="flex items-center space-x-2 text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm">{error}</span>
    </div>
    <Button size="sm" variant="secondary" onClick={handleRetry}>
      Retry
    </Button>
  </div>
)}

          {(() => {
            console.log('🚗 [VehicleDetailsPopover] Render condition check:', {
              vehicleDetails: !!vehicleDetails,
              success: vehicleDetails?.success,
              loading: isLoading,
              shouldShow: vehicleDetails && vehicleDetails.success && !isLoading
            });
            return vehicleDetails && vehicleDetails.success && !isLoading;
          })() && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {vehicleDetails.cached && (
                  <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    ✓ Cached data (verified within 24h)
                  </div>
                )}
                {!vehicleDetails.cached && (
                  <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                    ✓ Fresh data from API
                  </div>
                )}
              </div>
              
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

                {vehicleDetails.ownerName && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Owner Name</p>
                    <p className="text-sm font-semibold text-foreground">{vehicleDetails.ownerName}</p>
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

                {(vehicleDetails.chassisNumber || vehicleDetails.engineNumber) && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Technical Details</p>
                    <div className="space-y-2">
                      {vehicleDetails.chassisNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground">Chassis No.</p>
                          <p className="text-sm font-mono text-foreground">{vehicleDetails.chassisNumber}</p>
                        </div>
                      )}
                      {vehicleDetails.engineNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground">Engine No.</p>
                          <p className="text-sm font-mono text-foreground">{vehicleDetails.engineNumber}</p>
                        </div>
                      )}
                      {vehicleDetails.registrationAuthority && (
                        <div>
                          <p className="text-xs text-muted-foreground">RTO</p>
                          <p className="text-sm text-foreground">{vehicleDetails.registrationAuthority}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(vehicleDetails.fitnessExpiry || vehicleDetails.puccExpiry || vehicleDetails.insuranceExpiry) && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Expiry Dates</p>
                    <div className="space-y-2">
                      {vehicleDetails.fitnessExpiry && (
                        <div className="flex justify-between">
                          <p className="text-xs text-muted-foreground">Fitness</p>
                          <p className="text-xs text-foreground">
                            {new Date(vehicleDetails.fitnessExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {vehicleDetails.puccExpiry && (
                        <div className="flex justify-between">
                          <p className="text-xs text-muted-foreground">PUCC</p>
                          <p className="text-xs text-foreground">
                            {new Date(vehicleDetails.puccExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {vehicleDetails.insuranceExpiry && (
                        <div className="flex justify-between">
                          <p className="text-xs text-muted-foreground">Insurance</p>
                          <p className="text-xs text-foreground">
                            {new Date(vehicleDetails.insuranceExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VehicleDetailsPopover;