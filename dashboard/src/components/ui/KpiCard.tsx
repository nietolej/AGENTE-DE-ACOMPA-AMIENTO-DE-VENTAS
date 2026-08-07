import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number | string;
    isPositive: boolean;
    label?: string;
  };
  valueColor?: string;
}

export function KpiCard({ title, value, subValue, icon, trend, valueColor }: KpiCardProps) {
  return (
    <Card className="flex min-w-[180px] flex-col overflow-hidden bg-card/70 backdrop-blur-md shadow-sm border-border/50 hover:shadow-md hover:border-primary/40 transition-all duration-300">
      <CardHeader className="flex flex-row items-center gap-2 p-3 pb-1 space-y-0">
        {icon && <div className="text-primary/80 scale-90">{icon}</div>}
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 pb-3">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span 
              className="text-lg font-semibold tracking-tight"
              style={{ color: valueColor || 'inherit' }}
            >
              {value}
            </span>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {subValue}
              </p>
            )}
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold ml-2",
              trend.isPositive 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              <span>{trend.value}</span>
              {trend.label && <span className="opacity-80 font-normal ml-0.5">{trend.label}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
