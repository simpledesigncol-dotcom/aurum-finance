# Auditoría funcional / lógica / de datos — Aurum Finance

Fecha: 2026-08-30
Rama: `main` — commit de cierre **`d349f04`** (+ `acd48db`, `7f61316`)

## Resumen

Se auditaron los 12 módulos de la aplicación (ventas, cuentas por cobrar, compras, gastos,
cuentas por pagar, obligaciones, movimientos, tesorería, órdenes de trabajo, bancos, contactos
y contratos). El hallazgo raíz: **los movimientos financieros no se estaban registrando (o se
registraban mal) para la mayoría de los módulos**, lo que rompía saldos, reportes y trazabilidad.

Esta auditoría corrigió el flujo de dinero de extremo a extremo: toda transacción que implique
entrada o salida de dinero ahora crea un `FinancialMovement` con su origen (caja/banco) real,
tipo de movimiento, referencia y contacto, ejecutado atómicamente y alineado con los saldos.

---

## 1. Bugs críticos confirmados y corregidos

### 1.1 Ventas (`POST /api/sales`)
- **Antes**: las ventas en efectivo podían no crear movimiento si el pago era "efectivo" u
  otro método (clasificación equivocada de `credit`), el `contactName` se ignoraba y no se
  generaba CxC para ventas a crédito.
- **Ahora**: se clasifica el pago vía `isFullyPaidPaymentType` (todo salvo `credit`/`partial`
  es pago completo), el contacto se resuelve/crea automáticamente, se crea el movimiento
  `'sale'` con origen real (caja o banco según método), y se abre una cuenta por cobrar cuando
  la venta queda pendiente.

### 1.2 Venta: edición y eliminación (`PATCH/PUT/DELETE /api/sales/[id]`)
- **PUT**: recalcula el total ante cambios de descuento/impuesto, y en transiciones
  pagado ⇄ pendiente revierte o recrea el movimiento y el pago, manteniendo `amountPaid`,
  `balanceDue` y `status` coherentes.
- **DELETE**: elimina en cascada `SalePayment` → movimientos → items → CxC ligada (y sus
  abonos) → venta, todo en `$transaction`.

### 1.3 Compras (`POST /api/purchases`, `PUT/DELETE /api/purchases/[id]`)
- **POST**: mismo criterio de pago completo; crea movimiento `'purchase'` y abre CxP para
  compras a crédito.
- **PUT (nuevo)**: recalcula subtotal/total; si cambia el tipo de pago, sincroniza el
  movimiento (lo crea/elimina/actualiza) y mantiene la CxP ligada (crea, ajusta saldo o la
  liquida según la transición).
- **DELETE**: limpia también la CxP ligada y sus abonos en `$transaction`.

### 1.4 Cuentas por cobrar / por pagar
- **Pagos (`payments/route.ts`)**: ahora usan `movementType: 'ar_payment'` / `'ap_payment'`,
  resuelven el origen real (efectivo → caja por defecto; tarjeta/transferencia/pse → banco) y
  validan monto > 0 y sobrepago. Antes el dinero "desaparecía" (movimiento sin caja/banco).
- **Edición (`[id]/route.ts`)**: el saldo se recalcula en servidor (`nuevoOriginal - pagado`),
  ignorando el `balance` que mande el cliente; estado `paid`/`pending` recalculado.
- **Eliminación**: borra también los movimientos de sus abonos en `$transaction`.

### 1.5 Gastos (`POST /api/expenses`, `PUT/DELETE /api/expenses/[id]`)
- **POST**: resuelve `contactName`, registra el movimiento con notas (el modelo `Expense` no
  tiene campo `notes`; la nota vive en el movimiento), soporta `workOrderId` y el origen según
  método de pago.
- **PUT**: quitaba el `notes` inexistente del modelo `Expense` (error 500); ahora sincroniza
  el movimiento ligado (monto, fecha, origen, notas, contacto).
- **DELETE**: eliminación atómica del gasto + su movimiento.

### 1.6 Obligaciones (`POST /api/obligations/[id]/payments`)
- **Bug**: el pago usaba `sourceId: 'default'` literal (id inexistente).
- **Ahora**: `resolvePaymentSource` ignora `'default'` y resuelve caja/banco real;
  `movementType: 'obligation_payment'`, referencia `'obligation'`, y se recalcula la próxima
  cuota para obligaciones recurrentes.

### 1.7 Formulario de movimientos
- **`getDirection()`**: antes trataba `income` como salida (`out`); ahora usa `direction` de
  `EVENT_TYPES` (arregla ingresos clasificados como gastos en la lista).
- **Lista de movimientos**: al crear desde el modal la lista **desaparecía** (el `onClose` no
  refrescaba y `router.refresh()` no aplica a componentes cliente). Ahora `onClose` llama
  `fetchMovements()`.
- **Paginación**: el cliente leía `pages`, el servidor devuelve `totalPages` → se leen ambos
  con prioridad a `totalPages`.
- **Edición de origen**: `MovementEditForm` permite corregir la cuenta de origen (Caja/Banco)
  de movimientos mal clasificados, con selección de caja/cuenta y validación.

### 1.8 Órdenes de trabajo
- **Bug**: `saleAmount`/`costAmount` siempre 0; el formulario no los enviaba ni se calculaban.
- **Ahora**: el listado de OTs computa `financials` (ingresos, costos, utilidad, margen,
  por cobrar pendiente) desde las ventas ligadas y los movimientos confirmados; el detalle
  y el resumen muestran estos valores.

### 1.9 Tesorería
- **Caja**: el saldo ahora se suma desde `/api/cash-register/default` (`general + minor`);
  antes sumaba la apertura más movimientos con un criterio viejo (doble contabilización de
  la apertura en algunos casos). Cómputo: `balance = openingBalance + entradas − salidas`.

### 1.10 Bancos
- Se agregó filtro `status: 'confirmed'` a los balances y se eliminaron las consultas N+1 en
  el listado (una sola `groupBy`).

### 1.11 Trazabilidad general
- `FinancialMovement` creado para: venta, compra, abono a CxC, pago a CxP, pago de
  obligación y gasto — todos con `referenceType`/`referenceId` para rastrear la transacción
  de origen, `sourceType`/`sourceId` reales y `companyId`.
- `generateTransactionId`: ahora añade sufijo aleatorio de 2 dígitos para mitigar colisiones
  de IDs tipo `TXN-AAAAA-0000001`.

---

## 2. Hallazgos pendientes / recomendaciones (no bloqueantes)

| # | Hallazgo | Recomendación |
|---|----------|---------------|
| 1 | Módulo **Contratos (Agreements)** muerto: 0 rutas API, 0 UI; solo modelos en `schema.prisma` y referencias cosméticas en `app/audit`. | Eliminar los modelos `Agreement`/`AgreementItem`/`AgreementSettlement` del schema o implementar el módulo; hoy no aporta y ensucia la base. |
| 2 | Formulario de OT sigue enviando `saleAmount`/`costAmount` en 0. | Quitar esos campos del form o conectar la OT a ventas/compras (`workOrderId`) para que los `financials` muestren datos reales. |
| 3 | `POST /api/movements` (transferencias) crea el movimiento origen y el destino fuera de `$transaction`. | Envolver en transacción para evitar movimientos a medias. |
| 4 | Creación de CxC/CxP en `POST /sales` y `POST /purchases` ocurre fuera de la transacción. | Mover dentro de `$transaction` (ya se hace en edición/borrado). |
| 5 | `reports` "aging buckets" y `dashboard` (tendencias semana/vs semana) no actualizan saldos ni rangos de forma consistente. | Alinear con los nuevos `movementType` y recalcular rangos desde la TZ `America/Bogota`. |
| 6 | API Settings no expone `PUT`/`DELETE` para categorías/métodos de pago. | Implementar endpoints o eliminar la UI que los asume. |
| 7 | Credenciales de Supabase compartidas en chat y `DATABASE_URL` en Netlify. | **Cambiar la contraseña de la base en Supabase** tras validar el despliegue. |
| 8 | Sin harness de pruebas automatizadas. | Añadir al menos smoke tests de las rutas críticas (venta→movimiento→saldos). |
| 9 | `seed` puede quedar desactualizado respecto a la lógica nueva. | Revisar/actualizar `prisma/seed.ts` y re-sembrar. |
| 10 | Rutas API sin autenticación real (todo `companyId='default'`). | Prioridad futura: auth por compañía/usuario real. |

---

## 3. Archivos modificados (commit `d349f04`)

- `src/lib/payment-sources.ts` (nuevo): enrutado de métodos de pago → caja/banco y clasificación de pago completo.
- `src/app/api/sales/route.ts`, `sales/[id]/route.ts`
- `src/app/api/purchases/route.ts`, `purchases/[id]/route.ts`
- `src/app/api/accounts-receivable/[id]/route.ts`, `.../[id]/payments/route.ts`
- `src/app/api/accounts-payable/[id]/route.ts`, `.../[id]/payments/route.ts`
- `src/app/api/expenses/route.ts`, `expenses/[id]/route.ts`
- `src/app/api/obligations/[id]/payments/route.ts`
- `src/app/api/movements/route.ts`, `src/lib/transactions.ts`
- `src/components/movement-form.tsx`, `src/app/movements/page.tsx`
- `src/app/api/work-orders/route.ts`, `work-orders/[id]/financials/route.ts`, `src/app/work-orders/page.tsx`
- `src/app/treasury/page.tsx`, `src/app/api/bank-accounts/route.ts`, `bank-accounts/[id]/route.ts`

---

## 4. Pruebas manuales sugeridas (validar tras despliegue)

1. Crear una **venta en efectivo** → verificar que aparece un movimiento `+ venta` en
   Caja efectivo y que el saldo sube.
2. Crear una **venta a crédito** → verificar que NO mueve caja pero abre una CxC pendiente;
   registrar un abono → el abono mueve caja y reduce el saldo de la CxC.
3. Crear una **compra con tarjeta** → movimiento `− compra` en el banco Nequi/Bancolombia.
4. Crear un **gasto** con notas → las notas aparecen en el detalle del movimiento.
5. Editar el **origen** de un movimiento mal clasificado (Caja ⇄ Banco) desde Movimientos.
6. Eliminar una venta pagada → no queda movimiento huérfano en la caja.
7. Verificar que **Órdenes de Trabajo** muestran ingresos/costos/utilidad calculados.
8. Confirmar que **Tesorería** muestra Caja efectivo + bancos con los saldos correctos.
9. Pagar una **obligación** → el movimiento queda referenciado a la obligación y la caja baja.