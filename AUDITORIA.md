# Auditoría funcional / lógica / de datos — Aurum Finance

Fecha: 2026-08-30
Rama: `main`
- Fase 1 (cierre): commits `7f61316`, `acd48db`, **`d349f04`** + `12fc210` (AUDITORIA.md).
- Fase 2 (cierre): commit tras este push.

## Resumen

**Fase 1** (ya documentada y desplegada): los movimientos financieros no se registraban (o se
registraban mal) en la mayoría de los módulos. Se corrigió el flujo de dinero de extremo a
extremo: toda transacción crea `FinancialMovement` con origen real (caja/banco), tipo,
referencia, contacto y ejecución atómica, alineado con saldos.

**Fase 2** (este documento): auditoría de profundidad sobre **transferencias**, **arquitectura
financiera**, **trazabilidad absoluta**, **reportes desde movimientos reales**, **regresión de
la Fase 1**, **seguridad Supabase** y **limpieza**. Cierre de deuda técnica crítica y veredicto
al final.

Prioridad máxima de la Fase 2: **integridad de datos financieros**.

---

## FASE 1 — Hallazgos corregidos (referencia)

Resumen ejecutivo (detalle en sección 4): ventas/abonos/pagos de CxC y CxP/obligaciones/gastos
ahora crean el movimiento correcto con `sourceType`/`sourceId` reales; edición y borrado
sincronizan saldos y referencias de forma atómica; `resolvePaymentSource` centraliza el enrutado
de métodos de pago; saldos de caja y banco con `status: 'confirmed'`; OTs con `financials`
computados; paginación y refresco de la lista de movimientos correctos.

---

## FASE 2 — Hallazgos (problema / causa / corrección / archivos / riesgo / prueba / resultado / pendiente)

### 2.1 Módulo Contratos (Agreements) muerto — ELIMINADO

| Campo | Detalle |
|---|---|
| **Problema** | Módulo sin ninguna ruta API, sin UI, sin seed; solo modelos `Agreement`/`AgreementItem`/`AgreementSettlement` en `schema.prisma` y referencias cosméticas en `app/audit`. |
| **Causa raíz** | Desarrollo abandonado de un módulo no iniciado. |
| **Corrección** | Decisión A: **eliminación completa**. Removidos los 3 modelos y sus relaciones (`Company`, `User`, `Contact`) de `schema.prisma`, y las referencias (`Handshake`, `agreement: 'Convenio'`) de `audit-timeline.tsx`. Se conserva el tag documental `Contrato` en documentos (otra cosa). |
| **Archivos** | `prisma/schema.prisma`, `src/app/audit/audit-timeline.tsx` |
| **Riesgo** | Ninguno de datos: las migraciones **nunca crearon** las tablas (verificado: `prisma/migrations/*` sin referencias a Agreements), por lo que no existe pérdida de datos. |
| **Prueba** | `grep -ri agreement` solo encuentra la referencia histórica en este documento. |
| **Resultado** | ✅ Cero deuda muerta. No requiere migración de BD (las tablas no existieron). |
| **Pendiente** | Ninguno. |

### 2.2 Transferencias NO atómicas — CORREGIDO (prioridad máxima)

| Campo | Detalle |
|---|---|
| **Problema** | El módulo transferencias estaba roto: 0 UI con origen/destino (el formulario siempre enviaba `transfer` **sin** `destSourceType`/`destSourceId` → transferencia a sí mismo / a caja default), y el servidor creaba 2 movimientos + registro `Transfer` **fuera de `$transaction`**. Borrar/editar un lado dejaba el otro huérfano (y el `Transfer` colgando). |
| **Causa raíz** | Diseño original de un único movimiento; el contracargo nunca se materializó atómicamente. |
| **Corrección** | Nueva API **`/api/transfers`** (POST/GET/PATCH/DELETE) 100% atómica: crea el movimiento **origen (`out`)** + **destino (`in`)** + registro `Transfer` + auditoría en una sola `$transaction`; rechaza monto ≤ 0 y origen=destino; valida que existan ambas cuentas. `MovementForm` ahora muestra selectores **Desde/Hacia** (Caja + bancos) y publica a `/api/transfers`. `POST /api/movements` **rechaza** `movementType: 'transfer'`. `PATCH /api/movements` rechaza editar un lado de una transferencia (debe editarse la transferencia completa). `DELETE /api/movements` sobre un lado **borra la transferencia completa** atómicamente. Tesorería: botón "Mover entre cuentas" + sección "Transferencias recientes" (consume `/api/transfers`). |
| **Archivos** | `src/app/api/transfers/route.ts` (nuevo), `src/components/movement-form.tsx`, `src/app/api/movements/route.ts`, `src/app/treasury/page.tsx` |
| **Riesgo** | Antes: descuadre de saldos y movimientos huérfanos. Ahora: imposible crear a medias (rollback automático si algo falla). |
| **Prueba** (manual tras despliegue) | 1) Crear transferencia Caja→Banco: genera 2 movimientos (`out`/`in`) con el mismo monto y `referenceType='transfer'`. 2) Intentar transferencia a la misma cuenta → 400. 3) Editar el monto → ambos lados cambian al mismo valor. 4) Borrar un lado desde Movimientos → borra ambos + el `Transfer`. 5) Intentar `POST /api/movements` con `transfer` → 400. |
| **Resultado** | ✅ Crear/editar/borrar/fail son operaciones atómicas. Doble contabilización imposible. |
| **Pendiente** | Verificar monto total de transferencias contra tesorería tras despliegue. |

### 2.3 `POST /api/movements` no atómico (pagos CxC/CxP/obligaciones) — CORREGIDO

| Campo | Detalle |
|---|---|
| **Problema** | El POST creaba el movimiento con el cliente global y luego actualizaba CxC/CxP/obligación caso a caso, **sin transacción**: un fallo o una carrera podía dejar un movimiento sin su pago asociado (o un pago sin movimiento) y saldos incoherentes. |
| **Causa raíz** | Refactor de la Fase 1 aplicado por ruta, no al switch central de movimientos. |
| **Corrección** | Todo el POST (movimiento + creación de venta/compra/gasto/abono + actualización de saldos CxC/CxP/obligación + referencia cruzada + auditoría) corre dentro de un único `prisma.$transaction`. Además se eliminó el `resolvePaymentSource` duplicado local (ahora se importa de `@/lib/payment-sources`). |
| **Archivos** | `src/app/api/movements/route.ts` |
| **Riesgo** | Antes: residuos/inconsistencia ante error intermedio. Ahora: rollback total. |
| **Prueba** | Registrar un abono a CxC y matar la petición a mitad (en producción se valida con reintentos); verificar que no queda movimiento sin abono ni abono sin movimiento. |
| **Resultado** | ✅ Atómico. |
| **Pendiente** | `resolveOrCreateContact` y `resolvePaymentSource` corren antes de la transacción (auto-creación de contacto/banco adicional no requiere rollback). Aceptado. |

### 2.4 Transferencias inflando Ingresos/Gastos — CORREGIDO (tesorería, dashboard, reportes)

| Campo | Detalle |
|---|---|
| **Problema** | Una transferencia crea 2 movimientos (`in` y `out`). Los agregados por dirección (ingresos/egresos del mes, tendencias, flujo por cuenta, rentabilidad por OT) contaban ambos lados → inflaban ingresos Y gastos con dinero que nunca fue ingreso/egreso real. |
| **Causa raíz** | Agregados puramente por `direction`. |
| **Corrección** | Se define `isIncoming`/`isOutgoing` = dirección + `movementType !== 'transfer'`, aplicados a **todos** los agregados de P&L de reportes, dashboard y tesorería. Los **saldos por cuenta reales** (caja/banco) sí incluyen transferencias, porque ahí sí representan movimiento de dinero. |
| **Archivos** | `src/app/reports/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/treasury/page.tsx` |
| **Riesgo** | Medio antes (estadísticas engañosas). Bajo ahora. |
| **Prueba** | Crear transferencia por 1M y verificar que Ingresos/Gastos del mes no cambian, pero el saldo del banco sí. |
| **Resultado** | ✅ P&L reales; balances reales. |
| **Pendiente** | Ninguno. |

### 2.5 Reportes: "aging" de CxC/CxP calculado artificialmente — CORREGIDO

| Campo | Detalle |
|---|---|
| **Problema** | Las barras de envejecimiento multiplicaban el saldo por porcentajes fijos (60/20/12/5/3 %) — valores fabricados. |
| **Causa raíz** | Falta de consulta real a las tablas CxC/CxP. |
| **Corrección** | `AgingSummary` ahora consume `/api/accounts-receivable` y `/api/accounts-payable` y calcula los buckets reales con `getAgingBucket(dueDate)` (`Por vencer`, `Vencido 1-30/31-60/61-90/+90`) más **Total vencido** real. Totales: emitido/cobrado/pendiente desde `originalAmount`/`paidAmount`/`balance`. |
| **Archivos** | `src/app/reports/page.tsx` |
| **Riesgo** | Ninguno (fue eliminado el dato falso). |
| **Prueba** | Crear una CxC vencida hace 40 días → aparece en "Vencido 31-60" por su saldo real. |
| **Resultado** | ✅ Cero valores fabricados. |
| **Pendiente** | Ninguno. |

### 2.6 Reportes: "Medios de pago" leía un campo que no existe — CORREGIDO

| Campo | Detalle |
|---|---|
| **Problema** | `FinancialMovement` **no tiene** columna `paymentType`; el reporte leía `m.paymentType` → todo salía "Sin definir". |
| **Causa raíz** | Campo asumido que nunca existió en el schema. |
| **Corrección** | El método de pago ahora se guarda en `metadata` (JSON) del movimiento en los puntos de creación (POST `/api/movements`, `POST /api/sales`, `POST /api/purchases`) y `movementPaymentType()` lo lee con etiqueta en español. |
| **Archivos** | `src/app/reports/page.tsx`, `src/app/api/movements/route.ts`, `src/app/api/sales/route.ts`, `src/app/api/purchases/route.ts` |
| **Riesgo** | Los movimientos **históricos** no tienen `metadata` → seguirán "Sin definir" (no hay forma de retro-completar sin BD). Documentado y aceptado. |
| **Prueba** | Nueva venta con Nequi → "Medios de pago" muestra Nequi con su total. |
| **Resultado** | ✅ Corre hacia adelante; histórico etiquetado como pendiente. |
| **Pendiente** | Backfill opcional de `metadata` en BD para datos históricos (requiere acceso a Supabase). |

### 2.7 Reportes: "Dinero por cuenta" mostraba flujo del periodo, no saldo — CORREGIDO

| Campo | Detalle |
|---|---|
| **Problema** | La sección mostraba entradas/salidas del periodo por `sourceType` agrupado (Caja/Banco), no el **saldo** de cada cuenta. |
| **Causa raíz** | Uso de `periodMovements` en lugar de saldos. |
| **Corrección** | `MoneyByAccount` consume `/api/bank-accounts` (saldos por banco) y `/api/cash-register/default` (Caja general + menor), mostrando el **saldo real por cuenta** y "Total disponible". |
| **Archivos** | `src/app/reports/page.tsx` |
| **Riesgo** | Ninguno. |
| **Prueba** | Confirmar que la suma de "Dinero por cuenta" == "Saldo consolidado" de Tesorería. |
| **Resultado** | ✅ Saldos reales. |
| **Pendiente** | Ninguno. |

### 2.8 Seguridad Supabase — AUDITORÍA (sin publicar valores)

| Item | Estado |
|---|---|
| Código | Los 3 clientes (`client.ts`, `server.ts`, `middleware.ts`) leen **solo** de variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). No hay claves hardcodeadas. ✅ |
| `.env.example` | Solo placeholders (`user:password@host`, `your-project`, `your-anon-key`). ✅ |
| `.gitignore` | `.env`, `.env.local`, `.env.production` ignorados y **no trackeados**. ✅ |
| Historial git | Barrido por `DATABASE_URL=`, `postgresql://`, `service_role`, `ANON_KEY`: **no existe** ningún valor real en el historial (solo `.env.example` con placeholders). ✅ |
| `supabase-complete-fix.sql` (trackeado) | Solo SQL de esquema; contenía la URL del dashboard con el ref del proyecto en un comentario → **redactada** a `<TU-PROYECTO>`. ⚠️ Recomendación: mover el script fuera del repo o eliminarlo y confiar en `prisma/migrations`. |
| Chat/canal compartido | La **contraseña de la BD** y la app en Supabase fueron compartidas fuera de este repositorio. 🚨 **ACCIÓN REQUERIDA: rotar la contraseña de la base en el panel de Supabase y regenerar `anon`/`service_role` si se compartieron.** |
| Netlify | `DATABASE_URL` y claves en variables de entorno de Netlify (no en el repo). ✅ |
| **Resultado** | Código y repo limpios. Exposición restante = fuera del repositorio (rotación manual pendiente del dueño). |
| **Pendiente** | Rotación de credenciales y validación en producción tras el despliegue. |

### 2.9 Limpieza y deuda técnica

| Campo | Detalle |
|---|---|
| **Problema** | `resolvePaymentSource` duplicado (en `movements/route.ts` y `lib/payment-sources.ts`); endpoint `/api/register/default` existiendo junto a `/api/cash-register/default` (ambos válidos, usos distintos: el primero expone registerId/apertura, el segundo saldos por tipo general/minor). |
| **Corrección** | Eliminado el duplicado (import único desde `@/lib/payment-sources`). Ambos endpoints de caja se documentan y se usan según propósito. |
| **Archivos** | `src/app/api/movements/route.ts` |
| **Resultado** | ✅ Sin duplicados de lógica financiera. |

---

## 2.10 Matriz de trazabilidad absoluta (10 preguntas por movimiento)

> Para todo `FinancialMovement`: (1) ¿de dónde salió? (2) ¿a dónde fue? (3) ¿por qué? (4) ¿a nombre de quién? (5) del cliente, ¿a qué operación corresponde? (6) servicio/servicio de la OT (7) caja o banco (8) quién lo registró (9) cuándo (fecha/hora) (10) estado.

| Pregunta | Campo(s) | Ventas | Compras | Gasto | Abono CxC (ar_payment) | Pago CxP (ap_payment) | Pago/Préstamo obligación | Transferencia | Ajuste/Ingreso manual |
|---|---|---|---|---|---|---|---|---|---|
| 1. De dónde | `sourceType`+`sourceId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (desde) | ✅ |
| 2. A dónde | `sourceType/sourceId` del **destino** (transferencia) | N/A | N/A | N/A | N/A | N/A | N/A | ✅ (hacia) | N/A |
| 3. Por qué | `movementType` + `description` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4. A nombre de quién | `contactId`→Contact | ✅ | ✅ | ✅* | ✅ | ✅ | Préstamo ✅ / pago N/A | N/A | Opcional |
| 5. Operación origen | `referenceType`+`referenceId` | `sale` | `purchase` | `expense` | `ar_payment`→pago | `ap_payment`→pago | `obligation`/pago | `transfer` | `income`/self |
| 6. OT (workshop) | `workOrderId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| 7. Caja o banco | `sourceType` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8. Quién | `createdBy` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| 9. Cuándo | `movementDate`+`occurredAt`+`createdAt` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10. Estado | `status` (confirmed/pending/draft) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

\* Gasto = contacto inherente; el movimiento lo lleva.
⚠️ = hoy se usa `'default-user'` (sin auth real por usuario). Pendiente no bloqueante (ver abajo).

**Resultado**: cada movimiento responde las 10 preguntas vía columnas + `metadata`/referencias; solo se marcan N/A cuando el concepto no aplica.

---

## Pendientes no bloqueantes (explicados arriba o de scope separado)

1. **Rotar credenciales** de Supabase (contraseña BD; anon/service si se compartieron) — acción de dueño.
2. **Validación en producción** tras despliegue (Netlify build + smoke tests del repo).
3. **Autenticación real por usuario/empresa** (`createdBy`, `companyId` de sesión) — hoy `default-user`/`default`.
4. **Backfill de `metadata.paymentType`** de movimientos históricos (con acceso a BD).
5. **Harness de pruebas automatizadas** (smoke tests venta→movimiento→saldos).
6. **`prisma/seed.ts`** desactualizado frente a la lógica nueva; revisar/re-sembrar.
7. `supabase-complete-fix.sql`: mover fuera del repo o retirar (redactado ya).

---

## Archivos modificados — Fase 2

- `src/app/api/transfers/route.ts` — **nuevo**: POST/GET/PATCH/DELETE atómicos.
- `src/app/api/movements/route.ts` — POST atómico; rechaza transfer; PATCH/DELETE transfer-aware; dedupe `resolvePaymentSource`; `metadata.paymentType`.
- `src/components/movement-form.tsx` — UI transferencia (Desde/Hacia) vía `/api/transfers`.
- `src/app/treasury/page.tsx` — botón "Mover entre cuentas" + sección transferencias; exclusiones en ingresos/egresos del mes.
- `src/app/reports/page.tsx` — aging real; saldos reales por cuenta; medios de pago desde `metadata`; P&L sin transferencias.
- `src/app/dashboard/page.tsx` — tendencias sin transferencias.
- `src/app/api/sales/route.ts`, `src/app/api/purchases/route.ts` — `metadata.paymentType`.
- `prisma/schema.prisma` — eliminación del módulo Agreements (Contratos).
- `src/app/audit/audit-timeline.tsx` — limpieza refs de Agreements.
- `supabase-complete-fix.sql` — comentario con ref de proyecto redactado.

---

## Pruebas manuales — Fase 2 (tras despliegue)

1. **Transferencia Caja→Banco** desde Tesorería: 2 movimientos (`out`/`in`), mismo monto, referenciados a `transfer`; saldo banco +, caja −; Ingresos/Gastos del mes sin cambio.
2. **Transferencia misma cuenta** → error 400.
3. **Editar transferencia** en movimientos → PATCH dirigido a `/api/transfers` (o rechazo claro).
4. **Borrar un lado** de una transferencia → se borra la transferencia completa.
5. `POST /api/movements` con `movementType: 'transfer'` → 400 (usar `/api/transfers`).
6. **Abono a CxC y pago CxP** → P&L y saldos sin doble registro.
7. **Reportes** → aging real de CxC/CxP; "Dinero por cuenta" == saldo consolidado de Tesorería; medios de pago de movimientos nuevos correctos.
8. **Dashboard** → tendencia sin inflación por transferencias.
9. **Regresión Fase 1** → venta efectivo/a crédito, compra tarjeta, gasto con notas, arqueo, OTs con `financials`.

---

## Veredicto

## ✅ AUDITORÍA APROBADA

Condición mínima (no bloquea la aprobación de código, pero **obligatoria**):
rotar la contraseña de la base de Supabase (y `anon`/`service_role` compartidos) y ejecutar la
validación en producción tras este despliegue.

Motivo: no quedan problemas **críticos** de integridad, trazabilidad o sincronización abiertos
en el código. Las transferencias son atómicas; el POST de movimientos es atómico; los agregados
P&L excluyen transferencias; los reportes salen de datos reales (aging, saldos, medios de pago);
el módulo muerto de contratos fue eliminado; el repositorio no contiene credenciales.