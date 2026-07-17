-- Migración inicial para el Sistema de Acompañamiento de Ventas

-- 1. Tabla de metas para clientes
CREATE TABLE IF NOT EXISTS public.metas_clientes (
  codcli character varying NOT NULL,
  anio smallint NOT NULL,
  mes smallint NOT NULL,
  monto_meta numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (codcli, anio, mes),
  CONSTRAINT metas_clientes_codcli_fkey FOREIGN KEY (codcli) REFERENCES public.clientes(codcli)
);

-- 2. Tabla de metas para vendedores
CREATE TABLE IF NOT EXISTS public.metas_vendedores (
  codvend character varying NOT NULL,
  anio smallint NOT NULL,
  mes smallint NOT NULL,
  monto_meta numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (codvend, anio, mes),
  CONSTRAINT metas_vendedores_codvend_fkey FOREIGN KEY (codvend) REFERENCES public.vendedores(codvend)
);

-- 3. Índices recomendados para optimización de queries BI
-- Facturas por cliente y emisión (excluyendo anuladas)
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_emision 
ON public.facturas(cliente, emision) 
WHERE anulada = false;

-- Facturas por vendedor y emisión (excluyendo anuladas)
CREATE INDEX IF NOT EXISTS idx_facturas_codven_emision 
ON public.facturas(codven, emision) 
WHERE anulada = false;

-- Pagos detalle (cuenta corriente) por cliente y factura
CREATE INDEX IF NOT EXISTS idx_pagos_detalle_codmovcli_numdoc 
ON public.pagos_detalle(codmovcli, numdoc);

-- Movimientos de cobranza
CREATE INDEX IF NOT EXISTS idx_cobranzas_codmovcli 
ON public.cobranzas(codmovcli);

-- Devoluciones por cliente
CREATE INDEX IF NOT EXISTS idx_devoluciones_enc_cliente 
ON public.devoluciones_enc(cliente, emision);
