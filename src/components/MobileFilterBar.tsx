import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Filter } from "lucide-react";
import { TransactionFilters as ITransactionFilters } from "@/types/transaction";
import { TransactionFilters } from "@/components/TransactionFilters";

interface MobileFilterBarProps {
  initialFilters?: ITransactionFilters;
  onFiltersChange: (filters: ITransactionFilters) => void;
}

export const MobileFilterBar = ({ initialFilters, onFiltersChange }: MobileFilterBarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-30 bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur border-b mb-3">
      <div className="container mx-auto px-3 py-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Filter transactions</div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs px-3">
              <Filter className="h-3 w-3" /> Filters
            </Button>
          </DrawerTrigger>
          <DrawerContent className="pb-safe max-h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg">Filter Transactions</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto flex-1">
              <TransactionFilters initialFilters={initialFilters} onFiltersChange={onFiltersChange} />
            </div>
            <DrawerFooter className="px-4 pb-4 pt-2">
              <DrawerClose asChild>
                <Button className="w-full">Apply Filters</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};
