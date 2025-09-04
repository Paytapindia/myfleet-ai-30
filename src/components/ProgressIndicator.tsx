import { CheckCircle, Circle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'pending' | 'error';
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
}

export const ProgressIndicator = ({ steps, className }: ProgressIndicatorProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        return (
          <div key={step.id} className="relative">
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 relative">
                {step.status === 'completed' && (
                  <CheckCircle className="w-6 h-6 text-green-600 bg-white rounded-full" />
                )}
                {step.status === 'current' && (
                  <div className="w-6 h-6 rounded-full bg-primary border-4 border-primary/20 animate-pulse" />
                )}
                {step.status === 'pending' && (
                  <Circle className="w-6 h-6 text-muted-foreground" />
                )}
                {step.status === 'error' && (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                
                {/* Connecting line */}
                {!isLast && (
                  <div className={cn(
                    "absolute top-6 left-3 w-0.5 h-8 -translate-x-0.5",
                    step.status === 'completed' ? "bg-green-200" : "bg-muted-foreground/30"
                  )} />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pb-6">
                <div className="flex items-center space-x-2">
                  <h3 className={cn(
                    "text-sm font-medium",
                    step.status === 'completed' && "text-green-800",
                    step.status === 'current' && "text-primary",
                    step.status === 'pending' && "text-muted-foreground",
                    step.status === 'error' && "text-red-600"
                  )}>
                    {step.title}
                  </h3>
                  <Badge 
                    variant={
                      step.status === 'completed' ? 'secondary' :
                      step.status === 'current' ? 'default' :
                      step.status === 'error' ? 'destructive' : 'outline'
                    }
                    className="text-xs"
                  >
                    {step.status}
                  </Badge>
                </div>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};