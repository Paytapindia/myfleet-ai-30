import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FastagVerificationResponse } from "@/api/fastagApi";
import { saveFastagManual } from "@/api/fastagManual";

interface FASTagManualOverrideProps {
  vehicleNumber: string;
  onSaved: (res: FastagVerificationResponse) => void;
  onCancel?: () => void;
}

const FASTagManualOverride: React.FC<FASTagManualOverrideProps> = ({ vehicleNumber, onSaved, onCancel }) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("active");
  const [balance, setBalance] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [lastTransactionDate, setLastTransactionDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await saveFastagManual(vehicleNumber, {
        status,
        balance: balance ? Number(balance) : 0,
        bankName: bankName || undefined,
        lastTransactionDate: lastTransactionDate || undefined,
      });
      if (res.success) {
        toast({ title: "FASTag saved", description: "Manual details applied successfully" });
        onSaved(res);
      } else {
        toast({ title: "Save failed", description: res.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Enter FASTag Details Manually</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="balance">Balance (₹)</Label>
            <Input id="balance" type="number" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bankName">Issuing Bank</Label>
            <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lastTransactionDate">Last Transaction Date</Label>
            <Input id="lastTransactionDate" type="date" value={lastTransactionDate} onChange={(e) => setLastTransactionDate(e.target.value)} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Details"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FASTagManualOverride;
