import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Calendar, Fuel, MapPin, User, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchVehicleDetails as fetchRcDetails, VehicleApiResponse } from "@/services/vehicleApi";

interface VehicleDetails {
  number: string;
  make: string;
  model: string;
  year: number;
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
  registrationDate: string;
  chassisNumber: string;
  engineNumber: string;
  ownerName: string;
  registeredAddress: string;
  color: string;
  category: string;
}

interface VehicleDetailsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  vehicleNumber: string;
}

// Map API response to modal structure
const mapApiToDetails = (api: VehicleApiResponse, vehicleNumber: string): VehicleDetails => {
  return {
    number: api.number || vehicleNumber,
    make: api.make || "—",
    model: api.model || "",
    year: api.year ? parseInt(api.year, 10) : new Date().getFullYear(),
    fuelType: (api.fuelType as any) || 'Petrol',
    registrationDate: api.registrationDate || "",
    chassisNumber: api.chassisNumber || "",
    engineNumber: api.engineNumber || "",
    ownerName: api.ownerName || "",
    registeredAddress: "",
    color: "",
    category: "",
  };
};

const VehicleDetailsModal = ({ open, setOpen, vehicleNumber }: VehicleDetailsModalProps) => {
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async (forceRefresh = false) => {
    setError(null);
    setLoading(true);
    console.log(`🚙 [VehicleDetailsModal] Fetching details for: ${vehicleNumber}, forceRefresh: ${forceRefresh}`);
    
    try {
      const api = await fetchRcDetails(vehicleNumber, forceRefresh);
      console.log('🚙 [VehicleDetailsModal] API response:', api);
      
      if (api.success) {
        const mappedDetails = mapApiToDetails(api, vehicleNumber);
        console.log('🚙 [VehicleDetailsModal] Mapped details:', mappedDetails);
        setVehicleDetails(mappedDetails);
        setError(null);
      } else {
        console.log('🚙 [VehicleDetailsModal] API failed:', api.error);
        setVehicleDetails(null);
        setError(api.error || 'Failed to fetch vehicle details');
      }
    } catch (err) {
      console.error('🚙 [VehicleDetailsModal] Network error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDetails(true); // forceRefresh = true
  };

  useEffect(() => {
    if (open && vehicleNumber) {
      fetchDetails(false); // Normal fetch on open
    }
  }, [open, vehicleNumber]);

  const getFuelTypeColor = (fuelType: string) => {
    switch (fuelType) {
      case 'Petrol': return 'bg-orange-500 text-white';
      case 'Diesel': return 'bg-blue-500 text-white';
      case 'CNG': return 'bg-green-500 text-white';
      case 'Electric': return 'bg-purple-500 text-white';
      default: return 'bg-muted text-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Vehicle Details - {vehicleNumber}
            </div>
            {vehicleDetails && !loading && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading vehicle details...</span>
          </div>
        ) : vehicleDetails ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Make & Model</span>
                </div>
                <p className="text-lg font-semibold">{vehicleDetails.make} {vehicleDetails.model}</p>
                <p className="text-sm text-muted-foreground">Year: {vehicleDetails.year}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Fuel Type</span>
                </div>
                <Badge className={getFuelTypeColor(vehicleDetails.fuelType)}>
                  {vehicleDetails.fuelType}
                </Badge>
              </div>
            </div>

            {/* Registration Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Registration Details</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3 bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Registration Date:</span>
                  <span className="text-sm font-medium">{new Date(vehicleDetails.registrationDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Chassis Number:</span>
                  <span className="text-sm font-medium">{vehicleDetails.chassisNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Engine Number:</span>
                  <span className="text-sm font-medium">{vehicleDetails.engineNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Color:</span>
                  <span className="text-sm font-medium">{vehicleDetails.color}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <span className="text-sm font-medium">{vehicleDetails.category}</span>
                </div>
              </div>
            </div>

            {/* Owner Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Owner Information</span>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Owner Name:</span>
                  <span className="text-sm font-medium">{vehicleDetails.ownerName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Registered Address:</span>
                  <p className="text-sm font-medium">{vehicleDetails.registeredAddress}</p>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchDetails(false)} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No vehicle details available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailsModal;