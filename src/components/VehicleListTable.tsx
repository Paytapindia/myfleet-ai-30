import { useState } from "react";
import { Trash2, User, Link as LinkIcon, Fuel, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useVehicles } from "@/contexts/VehicleContext";
import { useToast } from "@/hooks/use-toast";
import type { Vehicle } from "@/types/vehicle";

interface VehicleListTableProps {
  vehicles: Vehicle[];
}

const VehicleListTable = ({ vehicles }: VehicleListTableProps) => {
  const { removeVehicle } = useVehicles();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (vehicleId: string, vehicleNumber: string) => {
    try {
      setDeletingId(vehicleId);
      await removeVehicle(vehicleId);
      toast({
        title: "Vehicle deleted",
        description: `${vehicleNumber} has been removed from your fleet.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>FASTag</TableHead>
            <TableHead>GPS</TableHead>
            <TableHead>Challans</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <p className="text-muted-foreground">No vehicles found</p>
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} className="hover:bg-muted/30">
                <TableCell>
                  <div>
                    <p className="font-semibold text-foreground">{vehicle.number}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className={vehicle.driver ? "text-foreground" : "text-muted-foreground"}>
                      {vehicle.driver?.name || "Unassigned"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Fuel className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">₹{vehicle.payTapBalance.toLocaleString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <Badge variant={vehicle.fastTagLinked ? "default" : "secondary"} className="text-xs">
                      {vehicle.fastTagLinked ? (
                        <><Check className="h-3 w-3 mr-1" />Linked</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" />Not Linked</>
                      )}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={vehicle.gpsLinked ? "default" : "secondary"} className="text-xs">
                    {vehicle.gpsLinked ? (
                      <><Check className="h-3 w-3 mr-1" />Active</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" />Inactive</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`h-4 w-4 ${vehicle.challans > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <span className={vehicle.challans > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                      {vehicle.challans}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === vehicle.id}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <strong>{vehicle.number}</strong> ({vehicle.model})? 
                          This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(vehicle.id, vehicle.number)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Vehicle
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default VehicleListTable;