# Especificación Técnica: Sistema de Acompañamiento de Ventas (BI)

> **Documento de diseño para implementación en Antigravity IDE (Gemini Pro)**
> Este documento define la lógica de negocio, las fórmulas matemáticas y los cruces relacionales exactos que el agente debe usar para construir cada métrica. Todas las referencias de tablas y columnas corresponden al esquema real `public.*` (PostgreSQL) provisto en `RELACION_DE_TABLAS.txt`.

---

## 0. Modelo de Datos: Mapa de Relaciones Clave

Antes de implementar cualquier módulo, el agente debe internalizar el siguiente mapa relacional. **Esto evita joins incorrectos.**

### 0.1 Tablas núcleo y sus llaves

| Tabla | PK | FKs relevantes | Rol en el sistema |
|---|---|---|---|
| `clientes` | `codcli` | `vendedor` → `vendedores.codvend`; `almacen_codigo` → `almacenes.codigo` | Maestro de clientes |
| `vendedores` | `codvend` | — | Maestro de fuerza de ventas |
| `productos` | `codart` | `grupo` → `grupos.gruart` | Maestro de artículos |
| `facturas` | `numfac` | `cliente` → `clientes.codcli`; `codven` → `vendedores.codvend` | **Encabezado de venta (fuente de verdad de ventas facturadas)** |
| `facturas_detalle` | `id` | `numfac` → `facturas.numfac`; `codart` → `productos.codart` | Renglones de venta (líneas de producto) |
| `cobranzas` | `id` | `codmovcli` → `clientes.codcli`; `codven` → `vendedores.codvend` | Movimientos de cobranza (recibos/aplicaciones de cobro) |
| `pagos_detalle` | `id` | `codmovcli` → `clientes.codcli` (`numdoc` referencia lógicamente a `facturas.numfac`) | **Libro de cuenta corriente / mayor auxiliar del cliente** |
| `devoluciones_enc` | `numdevo` | `cliente` → `clientes.codcli`; `numfac` → `facturas.numfac`; `codven` → `vendedores.codvend` | Encabezado de devoluciones |
| `devoluciones_ren` | `id` | `numdevo` → `devoluciones_enc.numdevo`; `item` → `productos.codart`; `factura` → `facturas.numfac` | Renglones de devolución |
| `stock_almacen` | `id` | `codart` → `productos.codart`; `almacen_codigo` → `almacenes.codigo` | Existencia actual por almacén |
| `movimientos_inv` | `id` | `codmovart` → `productos.codart`; `almacen` → `almacenes.codigo` | Kardex / historial de movimientos de inventario |
| `inv_transito` | `id` | `codart` → `productos.codart` | Mercancía en tránsito pendiente por despachar |
| `inv_produccion` | `id` | `codart` → `productos.codart` | Órdenes de producción/reposición pendientes |
| `bancos_mov` | `id` | (relación lógica vía `numdoc`/`concepto`) | Movimientos bancarios (para conciliación) |

### 0.2 ⚠️ Advertencia arquitectónica crítica (doble fuente de ventas)

El esquema contiene **dos circuitos paralelos** que el agente NO debe confundir:

1. **Circuito ERP (fuente de verdad histórica/contable):** `facturas` + `facturas_detalle` + `cobranzas` + `pagos_detalle` + `devoluciones_enc` + `devoluciones_ren`. Estos datos provienen de la sincronización del sistema administrativo (DBF/ERP) y son los que deben usarse para **todos los KPIs de este documento** (ventas, deuda, devoluciones, comisiones).
2. **Circuito App (captura operativa, pre-facturación):** `pedidos` + `pedidos_detalle` + `pagos_comprobantes` + `devoluciones` + `devoluciones_detalle`. Estos registros representan **solicitudes** hechas desde la app/portal de clientes, que luego son procesadas y facturadas en el ERP (`pedidos.nrofact_dbf`, `pedidos.estado_erp`). **No deben sumarse como venta real**, ya que duplicarían el ingreso una vez facturados. Su uso recomendado es exclusivamente operativo (ej. "pedidos pendientes por facturar", `estado_erp = 'pendiente'`).

> **Regla de oro para el agente:** Todo KPI de venta, cobranza o devolución en los 3 módulos usa el circuito ERP. El circuito App solo se usa si se pide explícitamente un análisis de "pedidos en proceso" o "conversión de pedido a factura".

### 0.3 Filtro global obligatorio

Toda consulta sobre `facturas` debe excluir anuladas:
```sql
WHERE facturas.anulada = false
```

### 0.4 Convención de signos en `pagos_detalle` (importante para Módulo 1)

`pagos_detalle` funciona como un **mayor auxiliar (cuenta corriente)** por documento (`numdoc` = número de factura). Cada factura genera varias líneas con distinto `tipo`:

| `tipo` | Significado | Signo típico |
|---|---|---|
| `FC` | Cargo por factura (deuda generada) | Negativo |
| `NC` | Nota de crédito / impuestos asociados | Positivo |
| `CA` | Cobro/cancelación total aplicada | Positivo |
| `AB` | Abono parcial aplicado | Positivo |

Cuando un documento está **totalmente saldado**, `SUM(importe)` agrupado por `numdoc` tiende a `0`. Por lo tanto:

```sql
-- Saldo pendiente por documento
SELECT numdoc, SUM(importe) AS saldo
FROM pagos_detalle
WHERE codmovcli = :codcli
GROUP BY numdoc
HAVING ABS(SUM(importe)) > 1  -- tolerancia por redondeo
```

Un `saldo` negativo indica deuda pendiente (factura no cobrada en su totalidad); esto es la base del cálculo de "Deuda Actual" del Módulo 1.

---

## MÓDULO 1: Análisis de Clientes

### 1.1 Venta Total ($)

```sql
SELECT SUM(f.tot_fac) AS venta_total
FROM facturas f
WHERE f.cliente = :codcli
  AND f.anulada = false
  AND f.emision BETWEEN :fecha_inicio AND :fecha_fin
```

### 1.2 Venta por cantidad de ítems

```sql
SELECT SUM(fd.cantidad) AS unidades_vendidas
FROM facturas_detalle fd
JOIN facturas f ON f.numfac = fd.numfac
WHERE f.cliente = :codcli
  AND f.anulada = false
  AND f.emision BETWEEN :fecha_inicio AND :fecha_fin
```

### 1.3 Venta por mes ($)

```sql
SELECT DATE_TRUNC('month', f.emision) AS mes, SUM(f.tot_fac) AS venta_mes
FROM facturas f
WHERE f.cliente = :codcli AND f.anulada = false
GROUP BY 1
ORDER BY 1
```
*Visualización sugerida: gráfico de barras/línea de 12 meses móviles, con línea de tendencia (regresión lineal simple) superpuesta.*

### 1.4 Cantidad de pedidos al año

Se define "pedido" como una **factura única** (`numfac`), ya que es la unidad transaccional real en el ERP:

```sql
SELECT COUNT(DISTINCT f.numfac) AS cant_pedidos
FROM facturas f
WHERE f.cliente = :codcli
  AND f.anulada = false
  AND EXTRACT(YEAR FROM f.emision) = :anio
```

### 1.5 Pedido Promedio

$$
\text{Pedido Promedio} = \frac{\text{Venta Total (1.1)}}{\text{Cantidad de Pedidos (1.4)}}
$$

### 1.6 Meta de Venta

**No existe tabla de metas en el esquema actual.** Se recomienda crear una tabla nueva:

```sql
CREATE TABLE public.metas_clientes (
  codcli character varying NOT NULL REFERENCES clientes(codcli),
  anio smallint NOT NULL,
  mes smallint NOT NULL,
  monto_meta numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (codcli, anio, mes)
);
```

Lógica de comparación:
```sql
% Cumplimiento = (Venta Real del mes / monto_meta) * 100
```
Si el cliente no tiene meta explícita definida, el agente debe usar como **meta sugerida** el promedio móvil de venta de los últimos 3 meses cerrados (`AVG` de 1.3), marcando el dato como "meta estimada" en la UI (no meta oficial).

### 1.7 Devoluciones

```sql
-- Monto
SELECT SUM(de.tot_devo) AS monto_devuelto
FROM devoluciones_enc de
WHERE de.cliente = :codcli AND de.emision BETWEEN :fecha_inicio AND :fecha_fin

-- Cantidad de ítems
SELECT SUM(dr.cantidad) AS items_devueltos
FROM devoluciones_ren dr
JOIN devoluciones_enc de ON de.numdevo = dr.numdevo
WHERE de.cliente = :codcli

-- Cantidad de pedidos afectados (facturas con al menos una devolución)
SELECT COUNT(DISTINCT de.numfac) AS pedidos_afectados
FROM devoluciones_enc de
WHERE de.cliente = :codcli
```

### 1.8 Análisis de Deuda y Pagos

**a) Monto de deuda actual (Facturado vs. Cobrado):**
```sql
-- Facturado histórico
SELECT SUM(f.tot_fac) AS total_facturado
FROM facturas f WHERE f.cliente = :codcli AND f.anulada = false;

-- Cobrado histórico (vía cobranzas)
SELECT SUM(c.importe) AS total_cobrado
FROM cobranzas c WHERE c.codmovcli = :codcli;

-- Deuda actual = -SUM(pagos_detalle.importe) por documentos con saldo abierto (ver §0.4)
SELECT -SUM(pd.importe) AS deuda_actual
FROM pagos_detalle pd
WHERE pd.codmovcli = :codcli
  AND pd.numdoc IN (
    SELECT numdoc FROM pagos_detalle
    WHERE codmovcli = :codcli
    GROUP BY numdoc HAVING ABS(SUM(importe)) > 1
  )
```
> Nota: `pagos_detalle` es más granular y confiable que comparar `facturas` vs `cobranzas` de forma independiente, porque ya refleja notas de crédito e impuestos aplicados por documento.

**b) Promedio de tiempo de pago (días):**
```sql
SELECT AVG(c.emision - f.emision) AS dias_promedio_pago
FROM cobranzas c
JOIN facturas f ON f.numfac = c.numdoc
WHERE c.codmovcli = :codcli
  AND c.tipo IN ('CA','AB')  -- solo movimientos de cobro efectivo, no ajustes
```
*Alternativa con `pagos_detalle`: usar `emision` de la línea `CA`/`AB` menos `emision` de la línea `FC` del mismo `numdoc`.*

**c) Medio de pago por bancos:**
```sql
SELECT pd.banco, SUM(pd.importe) AS monto, COUNT(*) AS transacciones
FROM pagos_detalle pd
WHERE pd.codmovcli = :codcli AND pd.tipo IN ('CA','AB') AND pd.banco IS NOT NULL
GROUP BY pd.banco
ORDER BY monto DESC
```

**d) Medios de pago por moneda ($, BS, USDT):**
```sql
SELECT pd.moneda, pd.formapag, SUM(pd.importe) AS monto
FROM pagos_detalle pd
WHERE pd.codmovcli = :codcli AND pd.tipo IN ('CA','AB')
GROUP BY pd.moneda, pd.formapag
```
> **Nota de calidad de dato:** en la muestra provista, `formapag` y `banco` aparecen frecuentemente vacíos. El agente debe mostrar una categoría `"No especificado"` en vez de descartar el registro, y reportar el `% de transacciones sin clasificar` como métrica de calidad de datos.

### 1.9 Proyección: Tendencia de venta anualizada

$$
\text{Venta Proyectada Anual} = \frac{\text{Venta Acumulada YTD}}{\text{Días Transcurridos del Año}} \times \text{Días Totales del Año}
$$

```sql
WITH ytd AS (
  SELECT SUM(tot_fac) AS venta_ytd
  FROM facturas
  WHERE cliente = :codcli AND anulada = false
    AND emision BETWEEN DATE_TRUNC('year', CURRENT_DATE) AND CURRENT_DATE
)
SELECT venta_ytd,
       venta_ytd / EXTRACT(DOY FROM CURRENT_DATE) *
       (CASE WHEN (EXTRACT(YEAR FROM CURRENT_DATE)::int % 4 = 0) THEN 366 ELSE 365 END) AS venta_proyectada_anual
FROM ytd
```

---

## MÓDULO 2: Análisis de Ventas por Producto

### 2.1 Ventas Totales

```sql
SELECT
  SUM(fd.cantidad) AS cantidad_vendida,
  SUM(fd.tot_ren) AS monto_vendido,
  COUNT(DISTINCT fd.numfac) AS num_pedidos
FROM facturas_detalle fd
JOIN facturas f ON f.numfac = fd.numfac
WHERE fd.codart = :codart
  AND f.anulada = false
  AND f.emision BETWEEN :fecha_inicio AND :fecha_fin
```

### 2.2 Devoluciones Totales

```sql
SELECT
  SUM(dr.cantidad) AS cantidad_devuelta,
  SUM(dr.importe) AS monto_devuelto,
  COUNT(DISTINCT dr.numdevo) AS num_pedidos_afectados
FROM devoluciones_ren dr
WHERE dr.item = :codart
```

### 2.3 Ratios de Devolución

$$
\%\text{Cantidad} = \frac{\text{Cantidad Devuelta (2.2)}}{\text{Cantidad Vendida (2.1)}} \times 100
$$
$$
\%\text{Monto} = \frac{\text{Monto Devuelto (2.2)}}{\text{Monto Vendido (2.1)}} \times 100
$$
$$
\%\text{Pedidos} = \frac{\text{Pedidos Afectados (2.2)}}{\text{Num. Pedidos (2.1)}} \times 100
$$

### 2.4 Métricas de Rotación e Inventario

**a) Stock actual (consolidado, todos los almacenes o filtrado):**
```sql
SELECT SUM(sa.cantidad) AS stock_actual
FROM stock_almacen sa
WHERE sa.codart = :codart
  -- opcional: AND sa.almacen_codigo IN (:almacenes_venta)  -- excluir almacenes de tránsito/garantía/dañada
```
> El maestro `almacenes` incluye almacenes no vendibles (`MERCANCIA EN TRANSITO`, `MERCANCIA DANADA`, `GARANTIA`, `MUESTRAS`). El agente debe permitir filtrar el stock "vendible" excluyendo estos códigos, o mostrar ambos: **Stock Total** vs **Stock Disponible para Venta**.

**b) Velocidad de venta diaria:**
```sql
-- N = ventana de análisis en días (ej. 90)
SELECT SUM(fd.cantidad) / :N AS velocidad_diaria
FROM facturas_detalle fd
JOIN facturas f ON f.numfac = fd.numfac
WHERE fd.codart = :codart AND f.anulada = false
  AND f.emision >= CURRENT_DATE - :N
```

**c) Cantidad de días disponibles de inventario:**
$$
\text{Días de Inventario} = \frac{\text{Stock Actual (a)}}{\text{Velocidad de Venta Diaria (b)}}
$$

**d) Meses de inventario:**
$$
\text{Meses de Inventario} = \frac{\text{Stock Actual (a)}}{\text{Venta Promedio Mensual}} \qquad \text{donde } \text{Venta Promedio Mensual} = \text{Velocidad Diaria (b)} \times 30
$$

**e) Contexto adicional recomendado (usa `inv_transito` e `inv_produccion`):**
```sql
SELECT SUM(pend_desp) AS pendiente_por_llegar
FROM inv_transito WHERE codart = :codart;

SELECT SUM(cantidad - despacho) AS pendiente_produccion
FROM inv_produccion WHERE codart = :codart;
```
Con esto se puede calcular un **"Stock Proyectado a 30/60/90 días"** = Stock Actual + Tránsito próximo a llegar − Venta proyectada del período, útil para alertas de quiebre de stock.

### 2.5 Top Clientes (Top 50)

```sql
SELECT
  f.cliente AS codcli,
  c.nomcli,
  SUM(fd.cantidad) AS cantidad_comprada,
  SUM(fd.tot_ren) AS monto_comprado,
  COUNT(DISTINCT f.numfac) AS num_compras
FROM facturas_detalle fd
JOIN facturas f ON f.numfac = fd.numfac
JOIN clientes c ON c.codcli = f.cliente
WHERE fd.codart = :codart AND f.anulada = false
GROUP BY f.cliente, c.nomcli
ORDER BY monto_comprado DESC
LIMIT 50
```

---

## MÓDULO 3: Análisis de Ventas por Vendedor

### 3.1 Rendimiento General

```sql
SELECT
  v.codvend, v.nomvend,
  SUM(f.tot_fac) AS venta_total,
  COUNT(DISTINCT f.numfac) AS cant_facturas,
  COUNT(DISTINCT f.cliente) AS clientes_atendidos
FROM facturas f
JOIN vendedores v ON v.codvend = f.codven
WHERE f.anulada = false
  AND f.emision BETWEEN :fecha_inicio AND :fecha_fin
GROUP BY v.codvend, v.nomvend
ORDER BY venta_total DESC
```
> **Nota de calidad de dato:** el maestro `vendedores.txt` contiene códigos genéricos sin nombre (`C1`, `C3`–`C9`, `D0`–`D2`) y un código `00 = CLIENTES INACTIVOS`. El agente debe excluir o agrupar estos códigos bajo una categoría `"Sin Vendedor Asignado / Código Administrativo"` para no distorsionar el ranking real de la fuerza de ventas.

### 3.2 Metas y Tendencias

**Meta asignada por vendedor** — requiere tabla nueva análoga a la de clientes:
```sql
CREATE TABLE public.metas_vendedores (
  codvend character varying NOT NULL REFERENCES vendedores(codvend),
  anio smallint NOT NULL,
  mes smallint NOT NULL,
  monto_meta numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (codvend, anio, mes)
);
```

**Tendencia de venta proyectada para el año** (misma lógica que §1.9, agregada por vendedor):
$$
\text{Tendencia Anual} = \frac{\text{Venta Acumulada YTD del Vendedor}}{\text{Días Transcurridos}} \times \text{Días Totales del Año}
$$

### 3.3 KPIs de Cumplimiento

```sql
% Cumplimiento Meta = (Venta Real Acumulada a la fecha / Meta Acumulada a la fecha) * 100
% Cumplimiento Tendencia = (Venta Real Acumulada a la fecha / Tendencia Proyectada Prorrateada a la fecha) * 100
```
Donde "Meta Acumulada a la fecha" es la suma de `monto_meta` de los meses transcurridos del año (de `metas_vendedores`).

### 3.4 Calidad de Venta (% Devoluciones por Vendedor)

```sql
WITH ventas AS (
  SELECT f.codven, SUM(f.tot_fac) AS monto_v, COUNT(DISTINCT f.numfac) AS pedidos_v
  FROM facturas f WHERE f.anulada = false
  GROUP BY f.codven
),
devoluciones AS (
  SELECT de.codven, SUM(de.tot_devo) AS monto_d, COUNT(DISTINCT de.numdevo) AS pedidos_d,
         SUM(dr.cantidad) AS cant_d
  FROM devoluciones_enc de
  JOIN devoluciones_ren dr ON dr.numdevo = de.numdevo
  GROUP BY de.codven
)
SELECT
  v.codven,
  (COALESCE(d.monto_d,0) / NULLIF(v.monto_v,0)) * 100 AS pct_monto,
  (COALESCE(d.pedidos_d,0) / NULLIF(v.pedidos_v,0)) * 100 AS pct_pedidos
FROM ventas v
LEFT JOIN devoluciones d ON d.codven = v.codven
```
> Para `% Cantidad` se requiere adicionalmente `SUM(fd.cantidad)` de ventas por vendedor (join `facturas_detalle` → `facturas` → `codven`), comparado contra `cant_d` de la CTE anterior.

---

## Anexo A — Consideraciones Técnicas para el Agente (Antigravity / Gemini Pro)

1. **Moneda base:** las tablas `facturas`, `cobranzas` y `pagos_detalle` manejan campos en dólares (`US$`) como moneda de referencia de línea (`pagos_detalle.moneda`), con `tasadolar` para conversión en movimientos `CA`/`AB`. Toda comparación histórica de montos en Bolívares debe normalizarse a USD usando `tasadolar` del momento de la transacción para evitar distorsión inflacionaria; **nunca sumar montos de distintos años sin normalizar**.
2. **Filtro de anulación:** repetir `anulada = false` en cada query sobre `facturas` — es la validación más crítica y de mayor impacto en la precisión de los KPIs.
3. **Granularidad de fecha:** usar siempre `emision` (no `synced_at`, que es metadato técnico de sincronización) como fecha de negocio.
4. **Manejo de nulos en dimensiones:** `banco`, `formapag`, `grupo`, `vendedor` pueden venir vacíos en la data cruda (ver muestras de `pagos_detalle.txt`, `vendedores.txt`). Todo `GROUP BY` sobre estas columnas debe mapear cadena vacía `''` a `"No especificado"` antes de graficar.
5. **Rendimiento:** para Módulo 2 (Top 50 clientes por producto) y KPIs de rotación, se recomienda materializar vistas agregadas (`materialized view`) refrescadas post-sincronización (`sync_log`), en lugar de calcular sobre `facturas_detalle` completo en cada consulta.
6. **Trazabilidad devolución→factura:** `devoluciones_ren.factura` y `devoluciones_enc.numfac` son la llave para saber qué factura originó la devolución; usarla para validar que el ratio de devolución de Módulo 2 no cuente devoluciones sin factura asociada (mercancía dañada/garantía directa).
7. **Tablas de apoyo no cubiertas en KPIs pero disponibles para drill-down:** `almacenes` (para segmentar por sede/país), `grupos` (familia de producto, ej. "HYUNDAI TUCSON", "KIA RIO" — útil para Módulo 2 a nivel agregado de línea), `bancos_mov` (para conciliación bancaria cruzada con §1.8c).

## Anexo B — Glosario de Tipos de Documento (`pagos_detalle.tipo` / `devoluciones_enc.estatus`)

| Código | Significado |
|---|---|
| `FC` | Factura de Cargo |
| `NC` | Nota de Crédito |
| `CA` | Cobro / Cancelación total |
| `AB` | Abono parcial |

---

*Fin del documento. Listo para ser interpretado por el agente en Antigravity IDE como especificación funcional para la generación de esquemas de reporte, vistas SQL y dashboards.*
