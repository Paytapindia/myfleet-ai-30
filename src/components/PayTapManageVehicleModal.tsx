import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreditCard, Shield, Lock, Settings, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PayTapCardSettings {
  cardNumber: string;
  contactlessEnabled: boolean;
  isBlocked: boolean;
  posLimit: number;
  status: 'active' | 'inactive' | 'blocked';
}

interface PayTapManageVehicleModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  vehicleId: string;
  vehicleNumber: string;
}

const PayTapManageVehicleModal = ({ open, setOpen, vehicleId, vehicleNumber }: PayTapManageVehicleModalProps) => {
  const { toast } = useToast();
  
  // Mock card settings - will be fetched from API
  const [cardSettings, setCardSettings] = useState<PayTapCardSettings>({
    cardNumber: "5555 **** **** 1234",
    contactlessEnabled: true,
    isBlocked: false,
    posLimit: 50000,
    status: 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [posLimitInput, setPosLimitInput] = useState(cardSettings.posLimit.toString());

  const handleContactlessToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      // TODO: Call paytapApi.updateContactlessPayment(cardId, enabled)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      setCardSettings(prev => ({ ...prev, contactlessEnabled: enabled }));
      toast({
        title: "Success",
        description: `Contactless payment ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contactless payment setting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCard = async (temporary: boolean = true) => {
    setLoading(true);
    try {
      // TODO: Call paytapApi.blockCard(cardId, temporary)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      setCardSettings(prev => ({ 
        ...prev, 
        isBlocked: true, 
        status: 'blocked' 
      }));
      
      toast({
        title: "Success",
        description: `Card ${temporary ? 'temporarily ' : ''}blocked successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockCard = async () => {
    setLoading(true);
    try {
      // TODO: Call paytapApi.unblockCard(cardId)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      setCardSettings(prev => ({ 
        ...prev, 
        isBlocked: false, 
        status: 'active' 
      }));
      
      toast({
        title: "Success",
        description: "Card unblocked successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePosLimit = async () => {
    const newLimit = parseFloat(posLimitInput);
    
    if (isNaN(newLimit) || newLimit < 0 || newLimit > 1000000) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid limit between ₹0 and ₹10,00,000",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Call paytapApi.setPosLimit(cardId, newLimit)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      setCardSettings(prev => ({ ...prev, posLimit: newLimit }));
      toast({
        title: "Success",
        description: `POS limit updated to ₹${newLimit.toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update POS limit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = () => {
    // Redirect to external PayTap dashboard
    window.open('https://dashboard.paytap.co.in/', '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'blocked': return 'destructive';
      case 'inactive': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Manage PayTap Card - {vehicleNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Card Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Card Number:</span>
                <span className="font-mono font-medium">{cardSettings.cardNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={getStatusColor(cardSettings.status)}>
                  {cardSettings.status.charAt(0).toUpperCase() + cardSettings.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Contactless Payment */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Contactless Payment</Label>
                    <p className="text-xs text-muted-foreground">Enable tap-to-pay transactions</p>
                  </div>
                </div>
                <Switch
                  checked={cardSettings.contactlessEnabled}
                  onCheckedChange={handleContactlessToggle}
                  disabled={loading || cardSettings.isBlocked}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Card Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cardSettings.isBlocked ? (
                <Button 
                  onClick={handleUnblockCard} 
                  disabled={loading}
                  className="w-full"
                >
                  Unblock Card
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={loading}>
                      Temporary Block Card
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Block Card Temporarily?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will temporarily block the card for security. You can unblock it anytime.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBlockCard(true)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Block Card
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>

          {/* POS Limit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                POS Transaction Limit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Limit:</span>
                <span className="font-medium">₹{cardSettings.posLimit.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Enter new limit"
                    value={posLimitInput}
                    onChange={(e) => setPosLimitInput(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button 
                  onClick={handleUpdatePosLimit}
                  disabled={loading || posLimitInput === cardSettings.posLimit.toString()}
                  size="sm"
                >
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Set PIN */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSetPin}
                variant="outline" 
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Set PIN (PayTap Dashboard)
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This will open the PayTap dashboard in a new tab
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayTapManageVehicleModal;