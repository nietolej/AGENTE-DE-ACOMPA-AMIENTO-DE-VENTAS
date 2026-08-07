import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Users, Package, CreditCard, TrendingUp, Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Welcome Banner Compacto */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="text-primary" size={20} />
            Dashboard Central
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de Inteligencia de Negocios de Distribuciones Hanei Motors.
          </p>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas del Mes"
          value="$124,500.00"
          icon={<TrendingUp size={18} />}
          trend={{ value: "+12.5%", isPositive: true, label: "vs mes anterior" }}
        />
        <KpiCard
          title="Clientes Activos"
          value="1,245"
          icon={<Users size={18} />}
          trend={{ value: "+3", isPositive: true, label: "nuevos esta semana" }}
        />
        <KpiCard
          title="Productos en Quiebre"
          value="14"
          icon={<Package size={18} />}
          trend={{ value: "-2", isPositive: true, label: "vs semana pasada" }}
        />
        <KpiCard
          title="Cobranza Pendiente"
          value="$45,230.00"
          icon={<CreditCard size={18} />}
          trend={{ value: "+5.2%", isPositive: false, label: "DSO aumentando" }}
        />
      </div>

      {/* Accesos Rápidos Horizontales */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/inventario" className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card/40 p-4 hover:bg-accent/50 hover:border-accent transition-all">
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:scale-110 transition-transform">
            <Package size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Sugerido de Compras</p>
            <p className="text-xs text-muted-foreground">Analizar quiebres y stock</p>
          </div>
          <ArrowUpRight size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary" />
        </Link>

        <Link href="/cobranzas" className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card/40 p-4 hover:bg-accent/50 hover:border-accent transition-all">
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:scale-110 transition-transform">
            <CreditCard size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Análisis de Cartera</p>
            <p className="text-xs text-muted-foreground">Estado de cuenta y DSO</p>
          </div>
          <ArrowUpRight size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary" />
        </Link>
        
        <Link href="/devoluciones" className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card/40 p-4 hover:bg-accent/50 hover:border-accent transition-all">
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:scale-110 transition-transform">
            <TrendingUp size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Auditoría de Calidad</p>
            <p className="text-xs text-muted-foreground">Métricas de devoluciones</p>
          </div>
          <ArrowUpRight size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary" />
        </Link>
      </div>

      {/* Main Chart */}
      <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Rendimiento Global de Ventas</CardTitle>
          <CardDescription className="text-xs">Evolución de los últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5">
            <div className="flex flex-col items-center text-muted-foreground/60">
              <Activity size={32} className="mb-2" />
              <p className="text-sm font-medium">Gráfico en construcción</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
