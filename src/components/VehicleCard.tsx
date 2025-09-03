import { useState } from "react";
import { 
  CreditCard, 
  Link as LinkIcon, 
  User, 
  Wrench, 
  Shield, 
  AlertTriangle, 
  Plus,
  Car,
  ChevronDown,
  ChevronUp,
  Fuel,
  UserCheck,
  Satellite,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AssignDriverModal from "./AssignDriverModal";
import VehicleDetailsModal from "./VehicleDetailsModal";
import VehicleDetailsPopover from "./VehicleDetailsPopover";
import FuelModal from "./FuelModal";
import FASTagDetailsModal from "./FASTagDetailsModal";
import DriverModal from "./DriverModal";
import { ServiceModal } from "./ServiceModal";
import { ChallanModal } from "./ChallanModal";
import { useDrivers } from "@/contexts/DriverContext";

interface VehicleCardProps {
  vehicle: {
    id: string;
    number: string;
    model: string;
    payTapBalance: number;
    fastTagLinked: boolean;
    driver: { id: string; name: string } | null;
    lastService: string;
    gpsLinked: boolean;
    challans: number;
    documents: {
      pollution: { status: 'uploaded' | 'missing' | 'expired', expiryDate?: string };
      registration: { status: 'uploaded' | 'missing' | 'expired', expiryDate?: string };
      insurance: { status: 'active' | 'expired' | 'missing', expiryDate?: string };
      license: { status: 'uploaded' | 'missing' | 'expired', expiryDate?: string };
    };
  };
}

const VehicleCard = ({ vehicle }: VehicleCardProps) => {
  const { getDriverById } = useDrivers();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
  const [showVehicleDetailsModal, setShowVehicleDetailsModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showFastagModal, setShowFastagModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [gpsActive, setGpsActive] = useState(vehicle.gpsLinked);

  // Get actual driver name from DriverContext
  const actualDriver = vehicle.driver ? getDriverById(vehicle.driver.id) : null;
  const driverName = actualDriver?.name || vehicle.driver?.name || null;

  // Get insurance status
  const insuranceStatus = vehicle.documents.insurance.status;
  const isInsuranceActive = insuranceStatus === 'active';

  const handleFastagClick = () => {
    setShowFastagModal(true);
  };

  return (
    <Card className="w-full sm:max-w-sm md:w-80 mobile-card md:flex-shrink-0 backdrop-blur-lg bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl sm:rounded-3xl overflow-hidden">
      {/* Apple-inspired Vehicle Header */}
      <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">{vehicle.number}</h3>
              <p className="text-sm text-muted-foreground font-medium truncate">{vehicle.model}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 ml-2">
            {vehicle.challans > 0 && (
              <Badge 
                variant="destructive" 
                className="rounded-full px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-600 border-red-200/50"
              >
                {vehicle.challans} Fine{vehicle.challans > 1 ? 's' : ''}
              </Badge>
            )}
            <VehicleDetailsPopover vehicleNumber={vehicle.number} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 pb-4 sm:pb-6 px-4 sm:px-6">
        {/* Quick Stats Row - 3 Key Metrics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Fuel Balance */}
          <div 
            className="flex flex-col items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-background/50 border border-border/30 cursor-pointer hover:bg-background/80 transition-all duration-300 touch-target"
            onClick={() => setShowFuelModal(true)}
          >
            <Fuel className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mb-1 sm:mb-2" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground font-medium mb-1 text-center">Fuel Balance</p>
            <p className="text-xs sm:text-sm font-bold text-primary truncate">₹{vehicle.payTapBalance}</p>
          </div>

          {/* FASTag */}
          <div 
            className="flex flex-col items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-background/50 border border-border/30 cursor-pointer hover:bg-background/80 transition-all duration-300 touch-target"
            onClick={handleFastagClick}
          >
            <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mb-1 sm:mb-2" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground font-medium mb-1 text-center">FASTag</p>
            <p className={`text-xs sm:text-sm font-bold ${vehicle.fastTagLinked ? 'text-green-600' : 'text-red-600'} text-center`}>
              {vehicle.fastTagLinked ? 'Linked' : 'Not Linked'}
            </p>
          </div>

          {/* Driver */}
          <div 
            className="flex flex-col items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-background/50 border border-border/30 cursor-pointer hover:bg-background/80 transition-all duration-300 touch-target"
            onClick={() => setShowDriverModal(true)}
          >
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mb-1 sm:mb-2" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground font-medium mb-1 text-center">Driver</p>
            <p className={`text-xs sm:text-sm font-bold ${driverName ? 'text-foreground' : 'text-muted-foreground'} truncate w-full text-center`}>
              {driverName || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Expandable Details Section */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="w-full touch-target">
            <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-background/30 border border-border/20 hover:bg-background/50 transition-all duration-300">
              <span className="text-sm font-medium text-muted-foreground">More Details</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              )}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-2 sm:space-y-3 pt-2 sm:pt-3">
            {/* Fines Count */}
            <div 
              className="flex items-center justify-between p-4 rounded-2xl bg-background/30 border border-border/20 cursor-pointer hover:bg-background/50 transition-all duration-300"
              onClick={() => setShowChallanModal(true)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Fines</p>
                  <p className={`text-xs font-medium ${vehicle.challans > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {vehicle.challans} Pending
                  </p>
                </div>
              </div>
              <Button size="sm" variant={vehicle.challans > 0 ? "destructive" : "secondary"} className="rounded-xl">
                {vehicle.challans > 0 ? 'Pay Now' : 'View'}
              </Button>
            </div>

            {/* Insurance Status */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-background/30 border border-border/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Insurance</p>
                  <p className={`text-xs font-medium ${isInsuranceActive ? 'text-green-600' : 'text-red-600'}`}>
                    {isInsuranceActive ? 'Active' : 'Inactive'}
                    {vehicle.documents.insurance.expiryDate && (
                      <span className="text-muted-foreground ml-1">
                        • Expires {new Date(vehicle.documents.insurance.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button size="sm" variant={isInsuranceActive ? "secondary" : "destructive"} className="rounded-xl">
                {isInsuranceActive ? 'View' : 'Renew'}
              </Button>
            </div>

            {/* Service Status */}
            <div 
              className="flex items-center justify-between p-4 rounded-2xl bg-background/30 border border-border/20 cursor-pointer hover:bg-background/50 transition-all duration-300"
              onClick={() => setShowServiceModal(true)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Service</p>
                  <p className="text-xs text-muted-foreground font-medium">Last: {vehicle.lastService}</p>
                </div>
              </div>
              <Button size="sm" variant="secondary" className="rounded-xl">
                Schedule
              </Button>
            </div>

            {/* GPS Status */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-background/30 border border-border/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Satellite className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">GPS</p>
                  <p className={`text-xs font-medium ${gpsActive ? 'text-green-600' : 'text-red-600'}`}>
                    {gpsActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={gpsActive ? "secondary" : "default"} 
                className="rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setGpsActive(!gpsActive);
                }}
              >
                {gpsActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>

            {/* 24/7 Roadside Assistance */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-background/30 border border-border/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Roadside Assistance</p>
                  <p className="text-xs text-muted-foreground font-medium">24/7 Emergency Support</p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="default" 
                className="rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('tel:+919900010964', '_self');
                }}
              >
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Driver Assignment Modal */}
      <AssignDriverModal
        open={showAssignDriverModal}
        setOpen={setShowAssignDriverModal}
        vehicleId={vehicle.id}
        vehicleNumber={vehicle.number}
        currentDriverId={vehicle.driver?.id}
      />

      {/* Driver Modal */}
      <DriverModal
        open={showDriverModal}
        setOpen={setShowDriverModal}
        vehicleId={vehicle.id}
        vehicleNumber={vehicle.number}
      />

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        open={showVehicleDetailsModal}
        setOpen={setShowVehicleDetailsModal}
        vehicleNumber={vehicle.number}
      />

      {/* Fuel Modal */}
      <FuelModal
        open={showFuelModal}
        setOpen={setShowFuelModal}
        vehicleNumber={vehicle.number}
        currentBalance={vehicle.payTapBalance}
      />

      {/* FASTag Details Modal */}
      <FASTagDetailsModal
        open={showFastagModal}
        setOpen={setShowFastagModal}
        vehicleNumber={vehicle.number}
      />

      {/* Service Modal */}
      <ServiceModal
        open={showServiceModal}
        setOpen={setShowServiceModal}
        vehicle={{
          id: vehicle.id,
          number: vehicle.number,
          lastService: vehicle.lastService
        }}
      />

      {/* Challan Modal */}
      <ChallanModal
        open={showChallanModal}
        setOpen={setShowChallanModal}
        vehicleNumber={vehicle.number}
        challanCount={vehicle.challans}
      />
    </Card>
  );
};

export default VehicleCard;