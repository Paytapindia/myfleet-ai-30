import { useState } from "react";
import { ArrowLeft, CreditCard, Plus, RefreshCw, History, Car, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PayTapManageVehicleModal from "@/components/PayTapManageVehicleModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useVehicles } from "@/contexts/VehicleContext";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PayTapDashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { vehicles } = useVehicles();
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [orderCardOpen, setOrderCardOpen] = useState(false);
  const [manageVehicleOpen, setManageVehicleOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState("");

  // Calculate totals
  const totalBalance = vehicles.reduce((sum, vehicle) => sum + vehicle.payTapBalance, 0);
  const activeCards = vehicles.filter(vehicle => vehicle.fastTagLinked).length;

  // Mock transaction data
  const recentTransactions = [
    { id: '1', type: 'credit', amount: 5000, date: '2024-01-15', description: 'Money added to account', vehicle: 'KA01AB1234' },
    { id: '2', type: 'debit', amount: 150, date: '2024-01-14', description: 'Toll payment', vehicle: 'KA01AB1234' },
    { id: '3', type: 'debit', amount: 75, date: '2024-01-14', description: 'Parking fee', vehicle: 'KA02CD5678' },
    { id: '4', type: 'credit', amount: 2000, date: '2024-01-13', description: 'Money added to account', vehicle: 'KA02CD5678' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">PayTap Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-7xl">
        {/* Account Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <IndianRupee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all vehicles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCards}</div>
              <p className="text-xs text-muted-foreground">Assigned to vehicles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Car className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles.length}</div>
              <p className="text-xs text-muted-foreground">In your fleet</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Money
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Money to PayTap Account</DialogTitle>
                <DialogDescription>
                  Add money to your PayTap prepaid account for seamless transactions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Vehicle (Optional)</Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle to add money to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vehicles</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.number} - {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMoneyOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // TODO: Implement add money functionality
                  console.log('Adding money:', amount, 'to vehicle:', selectedVehicle);
                  setAddMoneyOpen(false);
                  setAmount("");
                  setSelectedVehicle("");
                }}>
                  Add Money
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={orderCardOpen} onOpenChange={setOrderCardOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Order New Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Order New Prepaid Card</DialogTitle>
                <DialogDescription>
                  Order a new PayTap prepaid card and assign it to a vehicle.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Assign to Vehicle</Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.number} - {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOrderCardOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // TODO: Implement order card functionality
                  console.log('Ordering card for vehicle:', selectedVehicle);
                  setOrderCardOpen(false);
                  setSelectedVehicle("");
                }}>
                  Order Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="vehicles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vehicles">Vehicle Balances</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            <TabsTrigger value="cards">Card Management</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle-wise Balance Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{vehicle.number}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">₹{vehicle.payTapBalance.toLocaleString()}</p>
                          <Badge variant={vehicle.fastTagLinked ? "default" : "secondary"}>
                            {vehicle.fastTagLinked ? "Card Linked" : "No Card"}
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedVehicle(vehicle.id);
                            setSelectedVehicleNumber(vehicle.number);
                            setManageVehicleOpen(true);
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction, index) => (
                    <div key={transaction.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transaction.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? <Plus className="h-4 w-4" /> : <History className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.vehicle} • {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={`font-medium ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                        </div>
                      </div>
                      {index < recentTransactions.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prepaid Card Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{vehicle.number}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={vehicle.fastTagLinked ? "default" : "outline"}>
                          {vehicle.fastTagLinked ? "Card Active" : "No Card"}
                        </Badge>
                        <Button size="sm" variant="outline">
                          {vehicle.fastTagLinked ? "View Details" : "Order Card"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* PayTap Manage Vehicle Modal */}
      <PayTapManageVehicleModal
        open={manageVehicleOpen}
        setOpen={setManageVehicleOpen}
        vehicleId={selectedVehicle}
        vehicleNumber={selectedVehicleNumber}
      />
    </div>
  );
};

export default PayTapDashboardPage;