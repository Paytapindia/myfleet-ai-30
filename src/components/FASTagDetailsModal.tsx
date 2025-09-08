import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Link as LinkIcon, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Building2,
  CreditCard,
  Calendar
} from "lucide-react";
import { verifyFastag, FastagVerificationResponse } from "@/api/fastagApi";
import { useToast } from "@/hooks/use-toast";

interface FASTagDetailsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  vehicleNumber: string;
}

const FASTagDetailsModal = ({ open, setOpen, vehicleNumber }: FASTagDetailsModalProps) => {
  const [fastagData, setFastagData] = useState<FastagVerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchFastagData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      console.log('Fetching FASTag data for vehicle:', vehicleNumber, 'forceRefresh:', forceRefresh);
      const result = await verifyFastag(vehicleNumber, forceRefresh);
      setFastagData(result);
      
      // Phase 4: Enhanced UX - Show appropriate messages for different scenarios
      if (!result.success && !result.data) {
        toast({
          title: "Verification Failed",
          description: result.error || "Failed to fetch FASTag details",
          variant: "destructive"
        });
      } else if (!result.success && result.data) {
        // Show cached data with warning
        toast({
          title: "Live data unavailable",
          description: `Showing cached data${result.dataAge ? ` from ${result.dataAge}` : ''}`,
          variant: "default"
        });
      } else if (result.success && result.cached) {
        // Successfully got cached data
        toast({
          title: "FASTag verified",
          description: `Using cached data${result.dataAge ? ` from ${result.dataAge}` : ''}`,
          variant: "default"
        });
      } else {
        // Fresh live data
        toast({
          title: "FASTag verified",
          description: "Live data retrieved successfully",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to connect to FASTag service",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setFastagData(null); // Clear existing data
    fetchFastagData(true); // Force refresh
  };

  // Auto-fetch data when modal opens
  React.useEffect(() => {
    if (open && !fastagData) {
      fetchFastagData();
    }
  }, [open]);

  const getStatusColor = (status?: string) => {
    if (!status) return "secondary";
    switch (status.toLowerCase()) {
      case 'active':
        return "default";
      case 'inactive':
      case 'blocked':
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return <AlertCircle className="h-4 w-4" />;
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'inactive':
      case 'blocked':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            FASTag Details - {vehicleNumber}
          </DialogTitle>
          <DialogDescription>
            Live verification may take up to 30 seconds. Cached data will be shown if available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting to FASTag service...</span>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>This may take up to 30 seconds</p>
                    <p>Cached data will be shown if available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : !fastagData ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No FASTag data available</p>
                  <Button onClick={() => fetchFastagData()} className="mt-4">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
           ) : (!fastagData.success && !fastagData.data) ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Verification Failed</h3>
                  <p className="text-muted-foreground mb-4">
                    {fastagData.error || "Unable to verify FASTag details"}
                  </p>
                  {fastagData.details && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {fastagData.details}
                    </p>
                  )}
                  <Button onClick={() => fetchFastagData()}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* FASTag Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">FASTag Status</CardTitle>
                   {fastagData.cached && (
                     <Badge variant={fastagData.dataAge ? "outline" : "secondary"} className="w-fit">
                       <Clock className="h-3 w-3 mr-1" />
                       {fastagData.dataAge ? `Cached: ${fastagData.dataAge}` : 'Cached Data (Recent)'}
                     </Badge>
                   )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getStatusIcon(fastagData.data?.status)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={getStatusColor(fastagData.data?.status)}>
                          {fastagData.data?.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicle Number</p>
                        <p className="font-semibold">{fastagData.data?.vehicleNumber || vehicleNumber}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FASTag Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">FASTag Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fastagData.data?.tagId && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tag ID</p>
                        <p className="font-mono text-sm font-semibold break-all">
                          {fastagData.data.tagId}
                        </p>
                      </div>
                    </div>
                  )}

                  {fastagData.data?.bankName && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Issuing Bank</p>
                        <p className="font-semibold">{fastagData.data.bankName}</p>
                      </div>
                    </div>
                  )}

                  {fastagData.data?.balance !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-lg font-bold text-primary">₹{fastagData.data.balance}</p>
                      </div>
                    </div>
                  )}

                  {fastagData.data?.lastTransactionDate && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Last Transaction</p>
                        <p className="font-semibold">
                          {new Date(fastagData.data.lastTransactionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Verification Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verification Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Verified At</p>
                      <p className="font-medium">
                        {fastagData.verifiedAt 
                          ? new Date(fastagData.verifiedAt).toLocaleString()
                          : 'Just now'
                        }
                      </p>
                    </div>
                     <div>
                       <p className="text-muted-foreground">Data Source</p>
                       <p className="font-medium">
                         {fastagData.cached 
                           ? (fastagData.dataAge ? `Cached (${fastagData.dataAge})` : 'Cached (Recent)')
                           : 'Live Verification'
                         }
                       </p>
                     </div>
                  </div>
                  
                  <Button 
                    onClick={handleRefresh} 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FASTagDetailsModal;