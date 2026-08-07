"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  UserCheck,
  CreditCard,
  RotateCcw,
  Boxes,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const links = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes (M1)", icon: Users },
  { href: "/productos", label: "Productos (M2)", icon: Package },
  { href: "/vendedores", label: "Vendedores (M3)", icon: UserCheck },
  { href: "/cobranzas", label: "Cobranzas (M4)", icon: CreditCard },
  { href: "/devoluciones", label: "Devoluciones (M5)", icon: RotateCcw },
  { href: "/inventario", label: "Inventario (M6)", icon: Boxes },
  { href: "/metas", label: "Configuración de Metas", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            H
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold text-sm">Hanei Motors</span>
            <span className="text-xs text-muted-foreground">App de Ventas</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos Principales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);

                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      render={<Link href={link.href} />}
                      isActive={isActive}
                      tooltip={link.label}
                    >
                      <link.icon className="size-4" />
                      <span>{link.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
