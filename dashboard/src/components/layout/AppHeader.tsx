"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

export function AppHeader() {
  const pathname = usePathname();
  const paths = pathname === "/" ? [] : pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            
            {paths.map((path, index) => {
              const isLast = index === paths.length - 1;
              const href = `/${paths.slice(0, index + 1).join("/")}`;
              const formattedPath = path.charAt(0).toUpperCase() + path.slice(1);

              return (
                <React.Fragment key={path}>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{formattedPath}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href}>{formattedPath}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Command Palette or Theme toggle can go here on the right */}
      <div className="ml-auto flex items-center gap-2">
        {/* Placeholder for future Command Palette trigger */}
        <div className="hidden text-sm text-muted-foreground md:flex items-center gap-1 border border-border/50 bg-muted/30 px-3 py-1 rounded-full cursor-not-allowed">
          <span className="text-xs">Buscar...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
    </header>
  );
}
