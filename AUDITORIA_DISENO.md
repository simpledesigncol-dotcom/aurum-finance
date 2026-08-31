# Auditoría de Diseño UI — Aurum Finance

Fecha: 2026-08-30
Método: auditoría estática de código módulo por módulo (sin runtime). Se comparó cada pantalla
contra el **canon** definido por `src/app/sales/page.tsx` y el sistema de tokens de `globals.css`.

## 0. Base / canon establecido

| Elemento | Definición canónica |
|---|---|
| Contenedor de página | `p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in` |
| Header | `h1` = `text-2xl font-semibold tracking-tight` + subtítulo `text-muted-foreground text-sm mt-0.5` |
| Botón primario | `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90` |
| Stat card | `bg-card rounded-xl border border-border p-4`, label `text-xs font-medium text-muted-foreground uppercase tracking-wide`, valor `text-xl font-bold tabular-nums mt-2 tracking-tight` |
| Listado | `bg-card rounded-xl border border-border` + cabecera `px-5 py-3.5 border-b border-border` con `h2 font-semibold text-sm` + filas `px-5 py-3 flex items-center gap-3 divide-y divide-border` con avatar `w-8 h-8 rounded-lg` |
| Badge estado | `text-xs font-medium px-2 py-0.5 rounded-full` con `bg-{success|warning|danger|muted}/[0.08] text-{...}` |
| Input | `w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-blue/20 focus:border-blue/40` |
| Modal | `bg-card rounded-xl`, overlay `bg-black/30 backdrop-blur-sm`, sombra `0_20px_60px_rgba(0,0,0,0.12)` |
| Estado | Loading: `Cargando...` centrado · Empty: icono `w-10 h-10 rounded-full bg-muted` + texto + CTA |
| Tokens | background, foreground, muted, card, border, **primary (#1A1A2E)**, **blue (#3B82F6)**, success, danger, warning |

---

## 1. Matriz módulo por módulo

Leyenda: ✓ = conforme al canon · ! = variante menor · ✗ = desviación · — = no aplica

| Módulo | Header/sub | Botón primario | Stat cards | Listado | Badges | Ortografía | Notas |
|---|---|---|---|---|---|---|---|
| Ventas | ✓ | ✓ Blue | ✓ | ✓ listado + h2 | ✓ | ! "accion" (confirm) | **Referencia canon** |
| Compras | ✓ | ✓ Blue | ! "Total compras" en `text-danger` | ✓ + h2 | ✓ | ! "articulo", "accion" | Filas sin `flex-wrap` |
| Gastos | ✓ | ✓ Blue | ✓ (label "Este mes") | ✗ **sin h2** (`py-3`) | — | ! categoria/metodo/Descripcion/accion | Filtro categoría server-side |
| CxC (Receivables) | ✓ | ✓ Blue | ✓ | ✓ + h2 | ✗ badge compacto `text-[11px] px-1.5` | ! Descripcion/emision/eliminaran | Modal "cobro" + bloque saldo |
| CxP (Payables) | ✓ | ✓ Blue | ✓ | ✓ + h2 | ✗ badge compacto | ! Descripcion/emision/eliminaran/📁 emoji | Upload factura + abono |
| Obligaciones | ✓ | ✓ Blue | ! 4 cols `lg:grid-cols-4` | ✗ **sin h2** (filtros+buscador) + banner alertas | ✗ compacto + `text-purple`/`text-info` + **emojis tipo** | ✓ (tildes correctas) | summary server; único módulo bilingüe-correcto |
| Proveedores | ✓ | ✓ Blue | ✓ | ✗ **sin h2** + avatar **`rounded-full` inicial** | ✓ | ! Cedula/Numero/Telefono/Direccion/accion | Búsqueda client |
| Bancos | ✓ | ✓ Blue | ! 2 cards (`lg:grid-cols-3`) | ✗ **grilla de cards** (no listado) | — | ! Sin numero/Numero/accion/conexion | Avatar `bg-primary/[0.06]` |
| Caja | ✓ | ✗ **`bg-primary` + `text-sm px-4 py-2.5`** (MovementButton) | ! tarjetas de registro + mini cuadros emerald/red | ✓ 2 listados | ! badge `rounded-full` + emerald/amber | ~ | Arqueo con `bg-amber-600` |
| Tesorería | ✓ | ✓ Blue + `bg-primary` (Mover entre cuentas usa `bg-primary`) | ✓ 3 | ✓ + h2 | ✓ | ! "Tesoreria"×2 | Sección transferencias nueva |
| Movimientos | ✓ | ✗ **`bg-primary text-sm px-4`** | — (sin stats) | ✗ **`<table>`** (no listado) | ! `statusColor()` emerald/amber/red + `text-[11px]` | ✓ | delete con `confirm()` nativo, no ConfirmDialog |
| Dashboard | ! h1 `text-3xl font-bold` + `space-y-6` + **`bg-white`** | — | ✗ Hero "Posición neta" con hex `#DC2626`/`#B8860B`; indicators | ✗ secciones bg-white; avatares `rounded-full` | ! emerald/red/amber | ✓ | Server component; mayor divergencia |
| OT (lista) | ✓ | ✗ **`bg-primary text-sm px-4 py-2.5`** | ✗ `SummaryCard` con icono de color (valor sin color) + stagger | ✗ **`<table>`** + badge statusColor() + `rounded-xl` search | ✗ paleta named (emerald/amber/slate) | ✓ "Órdenes de Trabajo" | has margin `.toFixed(0)` |
| OT (detalle) | ! h1 `text-xl` | ✗ "Editar" toggle borde (no primario) | ✓ FinancialCard (valor coloreado) | ✓ tabs + subpaneles | ✗ movementTypeColor paleta named | ✓ | inputs `rounded-xl bg-muted/30` |
| Documentos | ✓ | ✓ Blue | ✓ (`formatFileSize` propio) | ✗ **sin h2** (filtro select) | ✓ `bg-muted` | ✓ (tilde correcta) | avatar `w-9 h-9 bg-muted` |
| Activos | ✓ | ✓ Blue | ✓ 4 (valor neto `text-blue`) | ✓ + h2 | ✗ `/10` en vez de `/[0.08]` | ✓ | progress bar `bg-warning/60` |
| Auditoría | ✓ | — | — | ✗ timeline **`bg-white`** + paleta named + dots | ✗ emerald/amber/red | ✓ | Server component |
| Ajustes | ✓ | ✓ Blue | — (tabs) | ✓ + h2 | ✓ `bg-muted` + **emoji 📋** en categorías | ! conexion | Buen canon de botones |
| Reportes | ✓ | ✓ Blue (Excel/PDF) | ✓ tarjetas | ✓ secciones `SectionCard` | ✓ (aging con hex `#10b981...` en barras) | ✓ | P&L del periodo (no global) |
| Login | ✗ autónomo (centrado, `rounded-2xl`, h1 `text-xl`) | ✓ Blue | — | — | — | ✓ | Justificado (pantalla auth) |

---

## 2. Inconsistencias transversales (priorizadas)

### P1 — Visual (doble canon de botón primario)
- **35** usos de `bg-blue text-white` (CRUD: ventas, compras, gastos, bancos, proveedores,
  documentos, activos, CxC, CxP, ajustes, reportes, caja-ish, login) vs **8** de
  `bg-primary text-primary-foreground` (movements, work-orders list/detail/form, tesorería
  "Mover entre cuentas", movement-button). `--primary` es #1A1A2E (navy) y `--blue` #3B82F6.
  → **El principal botón difiere según el módulo.** Se debe elegir UN canon.

### P1 — Sistema de color paralelo
- `src/lib/utils.ts` (`statusColor`, `movementTypeColor`) + dashboard + cash + reports +
  audit-timeline usan paleta **named** de Tailwind (`emerald/amber/red/slate/blue` y `bg-*-50`)
  mientras el resto usa los **tokens** `success/danger/warning`. Duplica la semántica.
- `src/app/obligations/page.tsx` introduce `text-purple`/`text-info` (sin token) y **emojis** de tipo.
- `src/app/payables/page.tsx` usa emoji `📁` hardcodeado.

### P1 — Ortografía (tildes/¿?) en textos visibles
| Texto | Archivos |
|---|---|
| "Esta accion" | sales:449, purchases:437, expenses:407, receivables:379, payables:544, suppliers:357, banks:287 |
| "Descripcion" | movement-form:325, expenses:319/325, payables:414, receivables:315 |
| "Direccion" | suppliers:309/315 |
| "Tesoreria" | treasury:190/205 |
| "Ano" | period-filter:10 (label anual) |
| "Obligacion" | global-search:37 |
| "eliminaran" | receivables:379, payables:544 |
| "categoria/*Metodo*/Numero/Descuento?" | expenses, suppliers, receivables handles |
| "Que paso? (¿?)" | movement-form:258 |
| "articulo" | purchases:254 |
| "Sin numero", "Numero de cuenta", "Error de conexion" | banks, settings, sales catch |

### P2 — Cabecera de listado inconsistente
- Con `h2`: ventas, compras, CxC, CxP, activos, ajustes, tesorería.
- **Sin `h2`** (solo filtro/buscador/thead): gastos, obligaciones, proveedores, documentos,
  movimientos (tabla), OT (tabla).

### P2 — Dos escuelas de inputs
- CRUD/modales: `rounded-lg border-border bg-background` (canon).
- movement-form, OT detalle, movements search: `rounded-xl bg-muted/30`.

### P2 — Badges de estado con doble tamaño
- `text-xs px-2 py-0.5 rounded-full` (ventas, compras, suppliers) vs `text-[11px] px-1.5 py-0.5`
  (CxC, CxP, obligaciones, movimientos, OT).

### P2 — Avatares heterogéneos
- Canon: `w-8 h-8 rounded-lg` + icono lucide con `bg-{tono}/[0.08]`.
- Variantes: suppliers círculo + inicial; obligations/categorías **emoji**; documents/settings
  `bg-muted` gris; banks `bg-primary/[0.06]`; tesorería/varias `w-9`/`w-12`.

### P3 — Componentes outlier
- `work-order-form.tsx`: modal `bg-white rounded-2xl` (único en la app) + overlay `bg-black/40`.
- `login/page.tsx`: pantalla propia (aceptable).
- Hex inline: dashboard `#DC2626`, `#B8860B`, `rgba(184,134,11,0.08)`; reports aging
  `#10b981/#f59e0b/#f97316/#dc2626/#f87171`.
- Borders dots: audit `border-white` con `bg-white` (debe ser `border-card`/`bg-card`).
- `floating-action-button.tsx`: `bg-blue` + sombra rgba.

---

## 3. Coherencia de valores entre módulos

| Valor | Módulos que lo muestran | ¿Coinciden? |
|---|---|---|
| Saldo por banco | Bancos · Tesorería · Reportes "Dinero por cuenta" · Dashboard | ✅ Misma fuente: `getBankAccountBalance` / `GET /api/bank-accounts` (movimientos `confirmed`). |
| Saldo caja (Gral+Menor) | Caja · Tesorería · Reportes | ✅ Mismo `GET /api/cash-register/default` (general+minor). |
| Saldo caja TODAS | Dashboard (`getTotalCashBalance`) | ⚠️ Suma **todas** las cajas de la compañía; caja/tesorería/reportes solo general+minor → difieren si hay >2 cajas. |
| Ingresos/Egresos del mes | Tesorería · Reportes · Dashboard (7 días y mensual) | ✅ Misma regla (`confirmed`, excluye `transfer`); difieren por ventana (mes/semana) — esperado. |
| Ingresos/Egresos "hoy" | Caja | ⚠️ **Incluye transferencias** (no excluye `transfer`) → infla brutos; neto se cancela. |
| Totales compras/gastos/CxC/CxP | Cada módulo | ✅ Globales (`totalPurchases`, `totalPending`, etc.) sin límite de filas → coherentes. |
| "Este mes" (gastos) | Gastos | ⚠️ Se recalcula sobre la lista **filtrada por categoría** → puede no representar el mes completo. |
| "N registros" / "hoy" (caja) | Caja | ⚠️ Derivado de `limit=200` → subestima si hay >200 movimientos. |
| `pagination.total` de movimientos | Movimientos | ⚠️ El `total` viene del server pero los items se filtran en cliente (búsqueda/categoría/contacto) → **el total/paginador no refleja los filtros**. |
| Utilidad por OT | OT (lista/detalle) · Reportes "Rentabilidad OT" | ⚠️ OT usa dirección bruta (incluye transferencias); Reportes excluye `transfer` → difieren si hay transferencias ligadas a OT. |
| Pendiente de CxC/CxP | CxC/CxP · Dashboard "Por cobrar/Comprometido" · Reportes aging | ✅ Mismo criterio (status no paid/cancelled, `balance`). |
| Saldos de obligaciones | Obligaciones · Dashboard "Comprometido" · Reportes (aging CxP no incluye obligaciones) | ✅ Obligaciones = fuente única (dashboard lo usa tal cual). |

Conclusión de valores: la mayoría de los saldos cuadran porque comparten funciones/endpoints.
Puntos a corregir: exclusión de transferencias en Caja, rebase de `limit=200`, `pagination.total`
vs filtros client, "Este mes" con filtro de categoría, y posible divergencia dashboard/varios si
existen cajas adicionales a las 2 estándar.

---

## 4. Recomendaciones accionables (por prioridad)

1. **Elegir un único canon de botón primario** y migrar los otros (recomendado: usar
   `bg-primary text-primary-foreground` para acciones primarias y preservar `bg-blue` como
   color de acento; o al revés). Afecta a movements, OT, tesorería (primary) y 12 módulos (blue).
2. **Unificar colores de estado** hacia tokens `success/danger/warning` en
   `lib/utils.ts`, dashboard, cash, reports (aging), audit-timeline, obligations (quitar
   purple/info o crear tokens), payables (emoji).
3. **Corregir ortografía** (lista de la sección 2, ~20 strings).
4. **Cabeceras de listado**: agregar `h2` donde falta o unificar el patrón filtro+buscador.
5. **Estándar de inputs y badges** (una sola escuela).
6. **Coherencia de valores**: excluir transferencias del "hoy" de Caja; calcular "hoy"/"N
   registros" con consulta agregada (no limit=200); aplicar filtros client al total de
   movimientos; "Este mes" global (no dependiente del filtro de categoría).
7. **Auditar OT/reportes** en plataforma real si existen transferencias ligadas a OT.
8. Verificar en producción el cuadre caja dashboard vs caja (número de registros creados).

## Veredicto visual
Base de diseño **clara y mayormente respetada** (tokens, shell de modal, cards, listados,
empty states). Inconsistencias predominantes: **doble canon de botón primario**, **sistema de
color paralelo** y **faltas de tilde** (P1). Coherencia de valores **alta** con 5 puntos de
riesgo menores documentados. No hay fallas funcionales; son desviaciones de homogeneización.

---

## 5. Estado de correcciones aplicadas (2026-08-30)

### P1 — Canon único de botón primario ✅
- Migrados a `bg-primary text-primary-foreground` (+ `hover:bg-primary/90`) los usos de
  `bg-blue text-white`: ventas, compras, gastos, bancos (crear + submit), proveedores,
  documentos, activos, CxC (crear + submit + submit cobro), CxP (crear + submit + submit
  pago), obligaciones (submit), ajustes, reportes (Exportar), caja (arqueo), tesorería
  (Realizar arqueo, Cerrar, Guardar), login, floating-action-button, movement-form submit,
  confirm-dialog (variante no-danger).
- Casos conservados con `bg-blue` como **acento** (decisión usuario): banner hero de
  tesorería, badge contador de movements, íconos/links/selecciones.

### P1 — Sistema de color paralelo ✅
- `lib/utils.ts`: `statusColor` y `movementTypeColor` migrados a tokens
  (`success/danger/warning/blue/muted`).
- Migration global `emerald→success`, `red→danger`, `amber→warning`, `bg-*-50 →
  bg-{token}/[0.08]` en: utils.ts, dashboard (incluye hex `#DC2626`/`#B8860B`/
  `rgba(184,134,11,0.08)` → clases de tokens), cash, movements, reports (área de stats y
  gráficos; **la paleta hex del aging se conserva**), audit-timeline, obligations
  (`text-purple`/`text-info` rotos → `blue`), payables (emoji `📁` → icono `FileText`).
- Reportes/auditoría: dots `border-white` → `border-card`.

### P1 — Ortografía ✅
- ~20 textos corregidos: "Esta accion→Esta acción", "Descripcion→Descripción",
  "Direccion→Dirección", "Tesoreria→Tesorería", "Ano→Año" (period-filter),
  "Obligacion→Obligación" (global-search), "eliminaran→eliminarán",
  "Que paso?→Qué pasó?", "articulo→artículo", "Sin numero→Sin número",
  "Numero de cuenta→Número de cuenta", "Error de conexion→Error de conexión.",
  "Cedula→Cédula" (Ciudadanía/Extranjería), "Telefono→Teléfono", "Metodo→Método".
  Verificado por grep que no quedan variantes sin tilde excepto keys internas.

### P2 — Cabeceras de listado ✅
- Añadido `h2` + contador en: Gastos, Obligaciones, Proveedores, Documentos, Movimientos,
  Órdenes de trabajo.

### P2 — Escuela de inputs ✅
- `rounded-xl bg-muted/30` → canon `rounded-lg bg-background` en movement-form, OT detalle,
  movements (search/selects).

### P2 — Badges ✅
- Unificados a `text-xs px-2 py-0.5` (antes `text-[11px]`/`px-1.5`): CxC, CxP, obligaciones,
  movimientos, OT, assets, documents, settings.

### P3 — Outliers ✅
- `work-order-form.tsx`: modal `bg-white rounded-2xl` → `bg-card rounded-xl` con sombra canon.
- Todos los `bg-white rounded-xl` de dashboard (incl. loading.tsx), audit y audit-timeline
  → `bg-card`.
- FAB: shadow `rgba(37,99,235,...)` → `rgba(26,26,46,...)`.

### Coherencia de valores (sección 3) ✅
- Caja "hoy" excluye transferencias y usa consulta agregada (sin `limit=200`).
- Movimientos: filtros viajan al server (`workOrderId`, `categoryId`, `contactId`,
  `paymentType`, `quickFilter`, search) → total/paginador coherentes; búsqueda incluye
  contactos y categorías; bug de quick filters (`noWorkOrder`/`noReceipt`) corregido.
- Gastos "Este mes"/"Total" calculados sobre el total (sin dependencia del filtro).

### Pendientes / no aplicados
- Backfill histórico de `metadata.paymentType` (requiere acceso a BD).
- `src/app/expenses/route.ts` con `metadata.paymentMethodId` documentado, no aplicado.
- Divergencia dashboard solo si existen >2 cajas (no es el caso actual).
- Reportes: útiles de exportación con iconos `text-success`/`text-danger` en lugar de
  emerald/red tras la migración (revisar en producción).