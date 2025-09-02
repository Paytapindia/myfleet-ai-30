
import FleetOverview from "@/components/FleetOverview";
import VehicleCard from "@/components/VehicleCard";
import AddVehicleModal from "@/components/AddVehicleModal";
import { AddTransactionHero } from "@/components/AddTransactionHero";
import { useVehicles } from "@/contexts/VehicleContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { vehicles, isLoading } = useVehicles();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <div className="w-8 h-8 bg-primary-foreground rounded"></div>
              </div>
              <p className="text-muted-foreground">Loading your fleet...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-0 sm:px-4 py-3 sm:py-6 max-w-7xl">
        {/* Fleet Overview Stats - moved to top */}
        <div className="px-3 sm:px-0">
          <FleetOverview />
        </div>
        
        {/* Quick Add Transaction */}
        <div className="px-3 sm:px-0">
          <AddTransactionHero />
        </div>
        
        {/* Vehicle Cards Section */}
        <div className="mt-4 sm:mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 px-3 sm:px-0 space-y-2 sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">Vehicle Manager</h2>
              <p className="text-sm text-muted-foreground">Manage up to 25 vehicles ({vehicles.length}/25)</p>
            </div>
            <div className="shrink-0">
              <AddVehicleModal />
            </div>
          </div>
          
          {/* Vehicle Cards - Mobile First Layout */}
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:space-x-4 md:overflow-x-auto pb-4 scrollbar-hide mobile-scroll px-3 sm:px-0">
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))
            ) : (
              <div className="w-full md:w-80 md:flex-shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-muted/30">
                <div className="text-center p-4 sm:p-6">
                  <Plus className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No Vehicles Yet</h3>
                  <p className="text-sm text-muted-foreground">Click \"Add Vehicle\" to get started</p>
                </div>
              </div>
            )}
            
            {/* Add Vehicle Card - Always show if under limit */}
            {vehicles.length < 25 && vehicles.length > 0 && (
              <div className="hidden md:flex md:w-80 md:flex-shrink-0 border-2 border-dashed border-border rounded-lg items-center justify-center min-h-[400px] bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="text-center p-6">
                  <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Add New Vehicle</h3>
                  <p className="text-sm text-muted-foreground">Expand your fleet management</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
};

export default Index;
