import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Car, CreditCard, Eye, FileText, Search, Calendar, MapPin, IndianRupee, RefreshCw, Loader2 } from "lucide-react";
import { useVehicles } from "@/contexts/VehicleContext";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

import { format } from "date-fns";

interface Challan {
  id: string;
  challanNumber: string;
  vehicleNumber: string;
  vehicleId: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  location: string;
  violation: string;
  status: 'pending' | 'paid' | 'disputed';
  penaltyAmount?: number;
  courtFee?: number;
  totalAmount: number;
}

interface ChallanSummary {
  totalPending: number;
  totalAmount: number;
  overdueCount: number;
  paidThisMonth: number;
}

export default function ChallansDashboardPage() {
  const { vehicles } = useVehicles();
  const { toast } = useToast();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [summary, setSummary] = useState<ChallanSummary>({
    totalPending: 0,
    totalAmount: 0,
    overdueCount: 0,
    paidThisMonth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [payingChallan, setPayingChallan] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (vehicles.length > 0) {
      fetchChallansData();
    }
  }, [vehicles]);

  const fetchChallansData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in.');
      }

      // Fetch all user vehicles with chassis and engine numbers
      const { data: userVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, number, chassis_number, engine_number')
        .eq('user_id', user.id);

      if (vehiclesError) {
        throw new Error('Failed to fetch vehicles');
      }

      if (!userVehicles || userVehicles.length === 0) {
        setChallans([]);
        setSummary({
          totalPending: 0,
          totalAmount: 0,
          overdueCount: 0,
          paidThisMonth: 0
        });
        return;
      }

      // Fetch challans for each vehicle
      const allChallans: Challan[] = [];
      
      for (const vehicle of userVehicles) {
        // Skip vehicles without required details
        if (!vehicle.chassis_number || !vehicle.engine_number) {
          console.log(`Skipping vehicle ${vehicle.number} - missing chassis/engine numbers`);
          continue;
        }

        try {
          console.log(`Fetching challans for vehicle: ${vehicle.number}`);
          
          const { data, error } = await supabase.functions.invoke('vehicleinfo-api-club', {
            body: {
              service: 'challans',
              vehicleId: vehicle.number,
              chassis: vehicle.chassis_number,
              engine_no: vehicle.engine_number,
              forceRefresh
            },
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (error) {
            console.error(`Error fetching challans for ${vehicle.number}:`, error);
            continue; // Skip this vehicle but continue with others
          }

          if (data?.success && data?.data) {
            const challansData = data.data;
            
            // Parse challans from various response formats
            let challansArray: any[] = [];
            
            if (Array.isArray(challansData?.response?.challans)) {
              challansArray = challansData.response.challans;
            } else if (Array.isArray(challansData?.challans)) {
              challansArray = challansData.challans;
            } else if (Array.isArray(challansData?.data)) {
              challansArray = challansData.data;
            } else if (Array.isArray(challansData)) {
              challansArray = challansData as any[];
            }

            // Convert to our challan format
            const parsedChallans: Challan[] = challansArray.map((challan: any) => ({
              id: `${vehicle.id}-${challan.challan_no || Math.random()}`,
              challanNumber: challan.challan_no || 'N/A',
              vehicleNumber: vehicle.number,
              vehicleId: vehicle.id,
              amount: parseFloat(challan.amount || '0'),
              issueDate: challan.date || new Date().toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              location: challan.area || challan.state || 'Unknown',
              violation: challan.offence || 'Traffic Violation',
              status: challan.challan_status === 'Cash' || challan.challan_status === 'Disposed' ? 'paid' : 'pending',
              penaltyAmount: 0, // Calculate based on days overdue if needed
              courtFee: 0,
              totalAmount: parseFloat(challan.amount || '0')
            }));

            allChallans.push(...parsedChallans);
          }
        } catch (vehicleError) {
          console.error(`Error processing vehicle ${vehicle.number}:`, vehicleError);
          // Continue with other vehicles
        }
      }

      setChallans(allChallans);
      
      // Calculate summary
      const pendingChallans = allChallans.filter(c => c.status === 'pending');
      const overdueChallans = pendingChallans.filter(c => new Date(c.dueDate) < new Date());
      const paidThisMonth = allChallans.filter(c => 
        c.status === 'paid' && 
        new Date(c.issueDate).getMonth() === new Date().getMonth()
      );

      setSummary({
        totalPending: pendingChallans.length,
        totalAmount: pendingChallans.reduce((sum, c) => sum + c.totalAmount, 0),
        overdueCount: overdueChallans.length,
        paidThisMonth: paidThisMonth.length
      });

      toast({
        title: "Challans Updated",
        description: `Found ${allChallans.length} challan(s) across ${userVehicles.length} vehicle(s)`
      });

    } catch (error: any) {
      console.error('Failed to fetch challans:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch challans data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayChallan = async (challanId: string) => {
    setPayingChallan(challanId);
    try {
      // TODO: Replace with actual payment API call
      // await challanApi.payChallan(challanId);
      
      // Mock payment process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setChallans(prev => prev.map(c => 
        c.id === challanId ? { ...c, status: 'paid' as const } : c
      ));
      
      toast({
        title: "Payment Successful",
        description: "Challan payment has been processed successfully"
      });
      
      fetchChallansData(); // Refresh data
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Failed to process challan payment",
        variant: "destructive"
      });
    } finally {
      setPayingChallan(null);
    }
  };

  const handleBulkPayment = async () => {
    const pendingChallans = filteredChallans.filter(c => c.status === 'pending');
    if (pendingChallans.length === 0) return;

    try {
      // TODO: Implement bulk payment API call
      toast({
        title: "Bulk Payment Initiated",
        description: `Processing payment for ${pendingChallans.length} challans`
      });
    } catch (error) {
      toast({
        title: "Bulk Payment Failed",
        description: "Failed to process bulk payment",
        variant: "destructive"
      });
    }
  };

  const filteredChallans = challans.filter(challan => {
    const vehicleMatch = selectedVehicle === "all" || challan.vehicleId === selectedVehicle;
    const statusMatch = statusFilter === "all" || challan.status === statusFilter;
    const searchMatch = searchTerm === "" || 
      challan.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.violation.toLowerCase().includes(searchTerm.toLowerCase());
    
    return vehicleMatch && statusMatch && searchMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'destructive';
      case 'disputed': return 'secondary';
      default: return 'default';
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Challans Dashboard</h1>
          <p className="text-muted-foreground">Manage traffic challans and fines for all vehicles</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchChallansData(true)} 
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button 
            onClick={handleBulkPayment} 
            disabled={filteredChallans.filter(c => c.status === 'pending').length === 0}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pay All Pending
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPending}</div>
            <p className="text-xs text-muted-foreground">Active challans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summary.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.paidThisMonth}</div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Challans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by challan number, vehicle, or violation..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Challans List */}
      <Card>
        <CardHeader>
          <CardTitle>Challans ({filteredChallans.length})</CardTitle>
          <CardDescription>
            Manage your traffic challans and fines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredChallans.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No challans found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm || selectedVehicle !== "all" || statusFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "No challans available for your vehicles"}
                </p>
              </div>
            ) : (
              filteredChallans.map((challan) => (
                <Card key={challan.id} className="border-l-4 border-l-destructive">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{challan.challanNumber}</h3>
                          <p className="text-sm text-muted-foreground">{challan.vehicleNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue(challan.dueDate) && challan.status === 'pending' && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                        <Badge variant={getStatusColor(challan.status)} className="text-xs">
                          {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Violation</p>
                        <p className="font-medium">{challan.violation}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <p className="text-sm">{challan.location}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className={`font-medium ${isOverdue(challan.dueDate) && challan.status === 'pending' ? 'text-destructive' : ''}`}>
                          {format(new Date(challan.dueDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Fine Amount</p>
                          <p className="font-bold text-lg">₹{challan.totalAmount.toLocaleString()}</p>
                        </div>
                        {challan.penaltyAmount && (
                          <div>
                            <p className="text-xs text-muted-foreground">+ Penalty</p>
                            <p className="text-sm text-destructive">₹{challan.penaltyAmount}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                        {challan.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => handlePayChallan(challan.id)}
                            disabled={payingChallan === challan.id}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            {payingChallan === challan.id ? 'Processing...' : 'Pay Now'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}