import VehicleCard from "@/components/VehicleCard";
import AddVehicleModal from "@/components/AddVehicleModal";
import VehicleListTable from "@/components/VehicleListTable";
import { useVehicles } from "@/contexts/VehicleContext";
import { Plus } from "lucide-react";

const VehicleManagerPage = () => {
  const { vehicles, isLoading } = useVehicles();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-pulse">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary-foreground rounded"></div>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">Loading your vehicles...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-0 sm:px-4 py-3 sm:py-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 px-3 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-3 sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">Vehicle Manager</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage and monitor your entire fleet in one place</p>
            </div>
            <div className="shrink-0">
              <AddVehicleModal />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Fleet capacity: {vehicles.length}/25 vehicles
          </p>
        </div>
        
        {/* Vehicle Cards Section */}
        <div className="mt-4 sm:mt-6">
          {/* Grid Layout for Vehicle Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-4 px-3 sm:px-0">
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))
            ) : (
              <div className="col-span-full border-2 border-dashed border-border rounded-lg flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-muted/30">
                <div className="text-center p-4 sm:p-6">
                  <Plus className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No Vehicles Yet</h3>
                  <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                    Start building your fleet by adding your first vehicle
                  </p>
                  <AddVehicleModal />
                </div>
              </div>
            )}
            
            {/* Add Vehicle Card - Always show if under limit */}
            {vehicles.length < 25 && vehicles.length > 0 && (
              <div className="border-2 border-dashed border-border rounded-lg flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="text-center p-4 sm:p-6">
                  <Plus className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">Add New Vehicle</h3>
                  <p className="text-sm text-muted-foreground mb-3 sm:mb-4">Expand your fleet management</p>
                  <AddVehicleModal />
                </div>
              </div>
            )}
          </div>
          
          {/* Vehicle List Table */}
          {vehicles.length > 0 && (
            <div className="mt-6 sm:mt-8 px-3 sm:px-0">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Vehicle List</h3>
              <VehicleListTable vehicles={vehicles} />
            </div>
          )}

          {vehicles.length > 0 && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/50 rounded-lg mx-3 sm:mx-0">
              <h3 className="text-sm font-medium text-foreground mb-2">Fleet Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Vehicles:</span>
                  <span className="ml-2 font-medium">{vehicles.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Available Slots:</span>
                  <span className="ml-2 font-medium">{25 - vehicles.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Balance:</span>
                  <span className="ml-2 font-medium">
                    ₹{vehicles.reduce((sum, vehicle) => sum + vehicle.payTapBalance, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pending Challans:</span>
                  <span className="ml-2 font-medium">
                    {vehicles.reduce((sum, vehicle) => sum + vehicle.challans, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VehicleManagerPage;