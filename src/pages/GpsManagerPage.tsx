import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useVehicles } from "@/contexts/VehicleContext";
import {
  Satellite,
  MapPin,
  Clock,
  Signal,
  Navigation,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Filter,
  Search,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock GPS data for demonstration
const mockGpsHistory = [
  { id: "1", vehicleId: "v1", timestamp: "2024-01-20 14:30:00", location: "MG Road, Bangalore", coordinates: "12.9716, 77.5946", speed: "45 km/h", status: "moving" },
  { id: "2", vehicleId: "v1", timestamp: "2024-01-20 14:25:00", location: "Brigade Road, Bangalore", coordinates: "12.9698, 77.6097", speed: "0 km/h", status: "stopped" },
  { id: "3", vehicleId: "v2", timestamp: "2024-01-20 14:20:00", location: "Koramangala, Bangalore", coordinates: "12.9352, 77.6245", speed: "30 km/h", status: "moving" },
];

const mockGpsAlerts = [
  { id: "1", vehicleId: "v1", type: "device_offline", message: "GPS device offline for 2 hours", timestamp: "2024-01-20 12:30:00", severity: "high" },
  { id: "2", vehicleId: "v2", type: "speed_violation", message: "Speed exceeded 80 km/h", timestamp: "2024-01-20 13:15:00", severity: "medium" },
];

export default function GpsManagerPage() {
  const { t } = useTranslation();
  const { vehicles, isLoading } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Satellite className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading GPS Manager...</p>
        </div>
      </div>
    );
  }

  const filteredVehicles = vehicles.filter(vehicle =>
    selectedVehicle === "all" || vehicle.id === selectedVehicle
  );

  const gpsActiveVehicles = vehicles.filter(v => v.gpsLinked).length;
  const gpsInactiveVehicles = vehicles.filter(v => !v.gpsLinked).length;
  const alertsCount = mockGpsAlerts.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t("nav.gpsManager", "GPS Manager")}
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage GPS tracking for your vehicle fleet
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="rounded-xl">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button className="rounded-xl">
              <Satellite className="h-4 w-4 mr-2" />
              Add GPS Device
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Active GPS</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{gpsActiveVehicles}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Inactive GPS</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{gpsInactiveVehicles}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Alerts</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{alertsCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Vehicles</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{vehicles.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Navigation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="overview">Vehicle Overview</TabsTrigger>
            <TabsTrigger value="history">Location History</TabsTrigger>
            <TabsTrigger value="alerts">GPS Alerts</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl">
                <SelectValue placeholder="Filter by vehicle" />
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
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="rounded-2xl border-0 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{vehicle.number}</CardTitle>
                      <Badge
                        variant={vehicle.gpsLinked ? "default" : "secondary"}
                        className="rounded-full"
                      >
                        {vehicle.gpsLinked ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Signal className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Signal: {vehicle.gpsLinked ? "Strong" : "No Signal"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Location: {vehicle.gpsLinked ? "Brigade Road, Bangalore" : "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Updated: {vehicle.gpsLinked ? "5 minutes ago" : "Never"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <Button 
                        size="sm" 
                        variant={vehicle.gpsLinked ? "secondary" : "default"}
                        className="rounded-xl"
                      >
                        {vehicle.gpsLinked ? "Deactivate" : "Activate"} GPS
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-xl">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View on Map</DropdownMenuItem>
                          <DropdownMenuItem>Device Settings</DropdownMenuItem>
                          <DropdownMenuItem>Download History</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="rounded-2xl border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Location History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Coordinates</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockGpsHistory.map((record) => {
                      const vehicle = vehicles.find(v => v.id === record.vehicleId);
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {vehicle?.number || "Unknown"}
                          </TableCell>
                          <TableCell>{record.timestamp}</TableCell>
                          <TableCell>{record.location}</TableCell>
                          <TableCell className="font-mono text-sm">{record.coordinates}</TableCell>
                          <TableCell>{record.speed}</TableCell>
                          <TableCell>
                            <Badge
                              variant={record.status === "moving" ? "default" : "secondary"}
                              className="rounded-full"
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card className="rounded-2xl border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>GPS Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockGpsAlerts.map((alert) => {
                  const vehicle = vehicles.find(v => v.id === alert.vehicleId);
                  return (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/20"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          alert.severity === "high" 
                            ? "bg-red-100 dark:bg-red-900/50" 
                            : "bg-amber-100 dark:bg-amber-900/50"
                        }`}>
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.severity === "high" 
                              ? "text-red-600 dark:text-red-400" 
                              : "text-amber-600 dark:text-amber-400"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {vehicle?.number || "Unknown Vehicle"}
                          </p>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                        </div>
                      </div>
                      <Badge
                        variant={alert.severity === "high" ? "destructive" : "secondary"}
                        className="rounded-full"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}