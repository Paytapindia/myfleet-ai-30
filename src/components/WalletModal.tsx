import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Minus, RefreshCw, CreditCard, DollarSign } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useVehicles } from '@/contexts/VehicleContext';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletModalProps {
  vehicleId?: string;
  trigger?: React.ReactNode;
}

export const WalletModal: React.FC<WalletModalProps> = ({ vehicleId, trigger }) => {
  const { walletTransactions, isLoading } = useWallet();
  const { vehicles } = useVehicles();

  const vehicle = vehicleId ? vehicles.find(v => v.id === vehicleId) : null;
  const vehicleTransactions = vehicleId 
    ? walletTransactions.filter(t => t.vehicleId === vehicleId)
    : walletTransactions;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit': return <Plus className="h-4 w-4 text-green-600" />;
      case 'debit': return <Minus className="h-4 w-4 text-red-600" />;
      case 'refund': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'commission': return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'settlement': return <DollarSign className="h-4 w-4 text-orange-600" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit': return 'bg-green-100 text-green-800';
      case 'debit': return 'bg-red-100 text-red-800';
      case 'refund': return 'bg-blue-100 text-blue-800';
      case 'commission': return 'bg-purple-100 text-purple-800';
      case 'settlement': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Wallet className="h-4 w-4 mr-2" />
            {vehicle ? `${vehicle.number} Wallet` : 'Wallet'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {vehicle ? `${vehicle.number} - Wallet Transactions` : 'All Wallet Transactions'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {vehicle && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(vehicle.payTapBalance || 0)}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Transaction History</h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : vehicleTransactions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No wallet transactions found
                </CardContent>
              </Card>
            ) : (
              vehicleTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </p>
                          {transaction.referenceNumber && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {transaction.referenceNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge className={getTransactionColor(transaction.type)}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </Badge>
                          <div className={`font-semibold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Balance: {formatCurrency(transaction.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};