import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CreditCard, MapPin, Calendar, IndianRupee, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

interface Challan {
  id: string;
  challanNumber: string;
  amount: number;
  issueDate: string;
  location: string;
  violation: string;
  status: 'pending' | 'paid' | 'disputed';
  dueDate: string;
  vehicleNumber: string;
}

interface ChallanModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  vehicleNumber: string;
  challanCount: number;
}

export const ChallanModal: React.FC<ChallanModalProps> = ({ 
  open, 
  setOpen, 
  vehicleNumber, 
  challanCount 
}) => {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [payingChallan, setPayingChallan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // Function to fetch challans from API with retry logic
  const fetchChallans = async (vehicleNum: string, retryCount = 0, forceRefresh = false) => {
    if (!vehicleNum) return;
    
    const maxRetries = 1;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Challan fetch attempt ${retryCount + 1} for vehicle: ${vehicleNum}`);
      
      // First get vehicle details to fetch chassis and engine numbers
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('chassis_number, engine_number')
        .eq('user_id', user.id)
        .eq('number', vehicleNum)
        .single();

      if (vehicleError || !vehicle) {
        throw new Error('Vehicle not found. Please verify RC details first.');
      }

      if (!vehicle.chassis_number || !vehicle.engine_number) {
        throw new Error('Chassis and engine numbers not available. Please verify RC details first.');
      }
      
      // Get user session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required. Please log in.');
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('vehicle-info', {
        body: {
          type: 'challan',
          vehicleId: vehicleNum,
          chassis: vehicle.chassis_number,
          engine_no: vehicle.engine_number,
          forceRefresh
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        
        // Retry on timeout or network errors
        if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch')) && retryCount < maxRetries) {
          console.log(`Retrying challan fetch... (${retryCount + 1}/${maxRetries})`);
          setError('Retrying... This may take up to 10 seconds');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          return fetchChallans(vehicleNum, retryCount + 1, forceRefresh);
        }
        
        throw new Error(error.message || 'Failed to fetch challans - This may take up to 10 seconds');
      }

      console.log('Challans API response:', data); // Debug log
      console.log('Raw challans data:', data?.data);

      if (!data.success) {
        setError(data.error || 'Challan verification failed');
        setIsLoading(false);
        return;
      }

      if (data?.success && data?.data) {
        // Handle both flat and nested response structures
        const challanData = data.data || data;
        console.log('Challan Data:', challanData); // Debug log
        
        setIsCached(data.cached || false);
        
        // Parse challans from various response formats (normalize structure)
        let challansArray: any[] = [];
        
        if (Array.isArray(challanData?.response?.challans)) {
          challansArray = challanData.response.challans;
        } else if (Array.isArray(challanData?.challans)) {
          challansArray = challanData.challans;
        } else if (Array.isArray(challanData?.data)) {
          challansArray = challanData.data;
        } else if (Array.isArray(challanData)) {
          challansArray = challanData as any[];
        }
        
        console.log('Extracted challans array:', challansArray);
        
        if (challansArray.length > 0) {
          const parsedChallans: Challan[] = challansArray.map((challan: any) => ({
            id: challan.challan_no || `ch-${Math.random()}`,
            challanNumber: challan.challan_no || 'N/A',
            amount: parseFloat(challan.amount || '0'),
            issueDate: challan.date || new Date().toISOString().split('T')[0],
            location: challan.area || challan.state || 'Unknown',
            violation: challan.offence || 'Traffic Violation',
            status: challan.challan_status === 'Cash' || challan.challan_status === 'Disposed' ? 'paid' : 'pending',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            vehicleNumber: vehicleNum
          }));
          
          setChallans(parsedChallans);
          
          const statusMsg = `${parsedChallans.length} challan(s) found`;
          if (data.cached) {
            toast.success(`${statusMsg} (from cache)`);
          } else {
            toast.success(`${statusMsg} (live data)`);
          }
        } else {
          // No challans found
          setChallans([]);
          const statusMsg = 'No challans found for this vehicle';
          if (data.cached) {
            toast.info(`${statusMsg} (from cache)`);
          } else {
            toast.success(`${statusMsg} (live data)`);
          }
        }
      } else {
        throw new Error(data?.error || 'Invalid response format');
      }
    } catch (error: any) {
      console.error('Error fetching challans:', error);
      
        // Retry on timeout or network errors
        if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'AbortError') && retryCount < maxRetries) {
          console.log(`Retrying challan fetch after error... (${retryCount + 1}/${maxRetries})`);
          setError('Retrying... This may take up to 10 seconds');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry  
          return fetchChallans(vehicleNum, retryCount + 1, forceRefresh);
        }
      
      setError(error.message || 'Network timeout - Request takes up to 10 seconds');
      setChallans([]);
      toast.error(error.message || 'Network timeout - Request takes up to 10 seconds');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && vehicleNumber) {
      fetchChallans(vehicleNumber, 0, true); // Force refresh on initial open
    }
  }, [open, vehicleNumber]);

  const handlePayChallan = async (challanId: string, amount: number) => {
    setPayingChallan(challanId);
    
    try {
      // Simulate payment API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update challan status
      setChallans(prev => prev.map(challan => 
        challan.id === challanId 
          ? { ...challan, status: 'paid' as const }
          : challan
      ));
      
      toast.success(`Payment of ₹${amount} successful!`);
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setPayingChallan(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-status-active text-white';
      case 'disputed':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-status-urgent text-white';
    }
  };

  const totalPending = challans
    .filter(challan => challan.status === 'pending')
    .reduce((sum, challan) => sum + challan.amount, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <AlertTriangle className="h-5 w-5 text-status-urgent" />
            Challans - {vehicleNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Status and Refresh */}
          <div className="flex items-center justify-between gap-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isCached ? (
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                  <span>Cached data</span>
                  {lastFetched && (
                    <span className="text-xs">
                      ({new Date(lastFetched).toLocaleTimeString()})
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span>Live data</span>
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => fetchChallans(vehicleNumber, 0, true)}
              disabled={isLoading}
              className="text-xs"
            >
              Force Refresh
            </Button>
          </div>

          {/* Summary Card */}
          {challans.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-status-urgent">
                      {challans.filter(c => c.status === 'pending').length}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      ₹{totalPending.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Amount</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {error && error.includes('Retrying') ? error : 'Loading challans... (This may take up to 10 seconds)'}
                  </p>
                </div>
                {!error && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please wait while we fetch your challan data from government servers
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Challans</h3>
                <p className="text-muted-foreground text-center mb-4">{error}</p>
                <Button onClick={() => fetchChallans(vehicleNumber)} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* No Challans */}
          {!isLoading && !error && challans.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No Challans Found</p>
              <p className="text-sm text-muted-foreground">
                Great! This vehicle has no pending challans.
              </p>
            </div>
          )}

          {/* Challans List */}
          {!isLoading && !error && challans.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Challan Details</h3>
              
              {challans.map((challan, index) => (
                <Card key={challan.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm sm:text-base">
                            {challan.challanNumber}
                          </p>
                          <Badge className={`text-xs ${getStatusColor(challan.status)}`}>
                            {challan.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-primary">
                          ₹{challan.amount.toLocaleString()}
                        </p>
                      </div>

                      <Separator />

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Violation:</span>
                          <span className="font-medium">{challan.violation}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Location:</span>
                          <span className="font-medium">{challan.location}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Issue Date:</span>
                          <span className="font-medium">{formatDate(challan.issueDate)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Due Date:</span>
                          <span className="font-medium text-status-urgent">
                            {formatDate(challan.dueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {challan.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handlePayChallan(challan.id, challan.amount)}
                            disabled={payingChallan === challan.id}
                            className="flex-1"
                          >
                            {payingChallan === challan.id ? (
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                Processing...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-3 w-3" />
                                Pay ₹{challan.amount}
                              </div>
                            )}
                          </Button>
                          
                          <Button size="sm" variant="outline" className="flex-1">
                            <ExternalLink className="h-3 w-3 mr-2" />
                            View Details
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pay All Button */}
          {!isLoading && !error && challans.filter(c => c.status === 'pending').length > 1 && (
            <Card className="border-primary">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm sm:text-base">Pay All Pending Challans</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Total: ₹{totalPending.toLocaleString()}
                    </p>
                  </div>
                  <Button className="w-full sm:w-auto">
                    <IndianRupee className="h-4 w-4 mr-2" />
                    Pay All (₹{totalPending.toLocaleString()})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};