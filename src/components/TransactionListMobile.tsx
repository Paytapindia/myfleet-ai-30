import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types/transaction";

interface TransactionListMobileProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const typeLabels: Record<Transaction["type"], string> = {
  revenue: "Revenue",
  fuel: "Fuel",
  parking: "Parking",
  toll: "Toll",
  fasttag: "FASTag",
  maintenance: "Maintenance",
  insurance: "Insurance",
  add_money: "Add Money",
  permit: "Permit",
  fine: "Fine",
  manual_income: "Manual Income",
  manual_expense: "Manual Expense",
};

export const TransactionListMobile = ({ transactions, isLoading }: TransactionListMobileProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Transaction Details</h3>
        <Badge variant="outline" className="text-xs">
          {transactions.length} transactions
        </Badge>
      </div>
      {transactions.map((t) => (
        <Card key={t.id} className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {typeLabels[t.type]}
                </Badge>
                <div className="text-xs text-muted-foreground truncate">
                  {t.vehicleNumber}
                </div>
              </div>
              <div className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                {t.description}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(t.date).toLocaleDateString("en-IN")}</span>
                {t.reference && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[100px]">{t.reference}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-sm font-bold ${t.category === "income" ? "text-status-active" : "text-status-urgent"}`}>
                {t.category === "income" ? "+" : "-"}₹{t.amount.toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
