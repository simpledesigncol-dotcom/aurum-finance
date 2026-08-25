export const EVENT_TYPES = [
  { id: 'income', label: 'Ingreso', icon: '📥', color: 'green', direction: 'in' },
  { id: 'expense', label: 'Gasto', icon: '📤', color: 'red', direction: 'out' },
  { id: 'transfer', label: 'Transferencia', icon: '🔄', color: 'gray', direction: 'transfer' },
  { id: 'sale', label: 'Venta', icon: '💰', color: 'green', direction: 'in' },
  { id: 'purchase', label: 'Compra', icon: '🛒', color: 'orange', direction: 'out' },
  { id: 'ar_payment', label: 'Cobro CxC', icon: '📥', color: 'blue', direction: 'in' },
  { id: 'ap_payment', label: 'Pago CxP', icon: '📤', color: 'red', direction: 'out' },
  { id: 'obligation_payment', label: 'Pago deuda', icon: '🏦', color: 'purple', direction: 'out' },
  { id: 'obligation_received', label: 'Préstamo', icon: '🤝', color: 'purple', direction: 'in' },
  { id: 'capital_contribution', label: 'Aporte capital', icon: '📈', color: 'green', direction: 'in' },
  { id: 'adjustment', label: 'Ajuste', icon: '📊', color: 'gray', direction: 'out' },
] as const

export const PAYMENT_TYPES = [
  { id: 'cash', label: 'Efectivo', icon: '💵', category: 'physical' },
  { id: 'transfer', label: 'Transferencia', icon: '🏦', category: 'digital' },
  { id: 'td', label: 'Tarjeta débito', icon: '💳', category: 'card' },
  { id: 'tc', label: 'Tarjeta crédito', icon: '💳', category: 'card' },
  { id: 'datafono', label: 'Datáfono', icon: '📱', category: 'card' },
  { id: 'nequi', label: 'Nequi', icon: '📲', category: 'digital' },
  { id: 'daviplata', label: 'Daviplata', icon: '📲', category: 'digital' },
  { id: 'pse', label: 'PSE', icon: '🌐', category: 'digital' },
  { id: 'cheque', label: 'Cheque', icon: '📄', category: 'physical' },
  { id: 'credit', label: 'Crédito', icon: '📝', category: 'other' },
  { id: 'qr', label: 'QR', icon: '📱', category: 'digital' },
] as const

export const MOVEMENT_TYPES = [
  { id: 'income', label: 'Ingreso', color: 'success' },
  { id: 'expense', label: 'Gasto', color: 'danger' },
  { id: 'transfer', label: 'Transferencia', color: 'blue' },
  { id: 'sale', label: 'Venta', color: 'success' },
  { id: 'purchase', label: 'Compra', color: 'warning' },
  { id: 'ar_payment', label: 'Cobro CxC', color: 'success' },
  { id: 'ap_payment', label: 'Pago CxP', color: 'danger' },
  { id: 'obligation_payment', label: 'Pago deuda', color: 'danger' },
  { id: 'obligation_received', label: 'Préstamo', color: 'blue' },
  { id: 'capital_contribution', label: 'Aporte capital', color: 'success' },
  { id: 'adjustment', label: 'Ajuste', color: 'muted' },
] as const

export const MOVEMENT_STATUSES = [
  { id: 'confirmed', label: 'Confirmado', color: 'success' },
  { id: 'pending', label: 'Pendiente', color: 'warning' },
  { id: 'draft', label: 'Borrador', color: 'muted' },
  { id: 'cancelled', label: 'Anulado', color: 'danger' },
] as const

export const QUICK_FILTERS = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'no-ot', label: 'Sin OT' },
  { id: 'no-receipt', label: 'Sin comprobante' },
  { id: 'cash', label: 'Efectivo' },
  { id: 'pending', label: 'Pendientes' },
] as const

export const OBLIGATION_TYPES = [
  { id: 'rent', label: 'Arriendo', category: 'Gastos Fijos', icon: '🏠', color: 'blue' },
  { id: 'payroll', label: 'Nómina', category: 'Gastos Fijos', icon: '👥', color: 'blue' },
  { id: 'electricity', label: 'Electricidad', category: 'Gastos Fijos', icon: '⚡', color: 'warning' },
  { id: 'water', label: 'Agua', category: 'Gastos Fijos', icon: '💧', color: 'info' },
  { id: 'gas', label: 'Gas', category: 'Gastos Fijos', icon: '🔥', color: 'warning' },
  { id: 'internet', label: 'Internet', category: 'Gastos Fijos', icon: '🌐', color: 'info' },
  { id: 'telephone', label: 'Teléfono', category: 'Gastos Fijos', icon: '📞', color: 'info' },
  { id: 'security', label: 'Seguridad', category: 'Gastos Fijos', icon: '🛡️', color: 'muted' },
  { id: 'cleaning', label: 'Aseo', category: 'Gastos Fijos', icon: '🧹', color: 'muted' },
  { id: 'accounting', label: 'Contabilidad', category: 'Gastos Fijos', icon: '📊', color: 'blue' },
  { id: 'insurance', label: 'Seguros', category: 'Gastos Fijos', icon: '🛡️', color: 'success' },
  { id: 'vehicle_expenses', label: 'Gastos vehículos', category: 'Gastos Fijos', icon: '🚗', color: 'warning' },
  { id: 'equipment_leasing', label: 'Arriendo equipos', category: 'Gastos Fijos', icon: '⚙️', color: 'muted' },
  { id: 'bank_loan', label: 'Préstamo bancario', category: 'Obligaciones Financieras', icon: '🏦', color: 'blue' },
  { id: 'partner_loan', label: 'Préstamo de socio', category: 'Obligaciones Financieras', icon: '🤝', color: 'purple' },
  { id: 'supplier_credit', label: 'Crédito proveedor', category: 'Obligaciones Financieras', icon: '📦', color: 'warning' },
  { id: 'credit_card', label: 'Tarjeta de crédito', category: 'Obligaciones Financieras', icon: '💳', color: 'danger' },
  { id: 'vehicle_financing', label: 'Financiamiento vehículo', category: 'Obligaciones Financieras', icon: '🚗', color: 'blue' },
  { id: 'leasing', label: 'Leasing', category: 'Obligaciones Financieras', icon: '📋', color: 'muted' },
  { id: 'vat', label: 'IVA', category: 'Obligaciones Tributarias', icon: '📄', color: 'danger' },
  { id: 'income_tax', label: 'Renta', category: 'Obligaciones Tributarias', icon: '💰', color: 'danger' },
  { id: 'municipal_taxes', label: 'Impuestos municipales', category: 'Obligaciones Tributarias', icon: '🏙️', color: 'warning' },
  { id: 'payroll_taxes', label: 'Parafiscales', category: 'Obligaciones Tributarias', icon: '👥', color: 'warning' },
  { id: 'social_security', label: 'Seguridad social', category: 'Obligaciones Tributarias', icon: '🏥', color: 'success' },
  { id: 'google_workspace', label: 'Google Workspace', category: 'Servicios Digitales', icon: '📧', color: 'info' },
  { id: 'microsoft365', label: 'Microsoft 365', category: 'Servicios Digitales', icon: '💻', color: 'info' },
  { id: 'adobe', label: 'Adobe', category: 'Servicios Digitales', icon: '🎨', color: 'danger' },
  { id: 'canva', label: 'Canva', category: 'Servicios Digitales', icon: '🖼️', color: 'info' },
  { id: 'chatgpt', label: 'ChatGPT', category: 'Servicios Digitales', icon: '🤖', color: 'success' },
  { id: 'hosting', label: 'Hosting', category: 'Servicios Digitales', icon: '🌍', color: 'blue' },
  { id: 'domains', label: 'Dominios', category: 'Servicios Digitales', icon: '🔗', color: 'blue' },
  { id: 'cloud', label: 'Servicios cloud', category: 'Servicios Digitales', icon: '☁️', color: 'info' },
  { id: 'maintenance', label: 'Contratos mantenimiento', category: 'Otros', icon: '🔧', color: 'warning' },
  { id: 'software_licenses', label: 'Licencias software', category: 'Otros', icon: '📦', color: 'purple' },
  { id: 'recurring_services', label: 'Servicios recurrentes', category: 'Otros', icon: '🔄', color: 'muted' },
  { id: 'other', label: 'Otro', category: 'Otros', icon: '📋', color: 'muted' },
] as const

export const OBLIGATION_CATEGORIES = [
  'Gastos Fijos',
  'Obligaciones Financieras',
  'Obligaciones Tributarias',
  'Servicios Digitales',
  'Otros',
] as const

export const OBLIGATION_FREQUENCIES = [
  { id: 'once', label: 'Único pago' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'biweekly', label: 'Quincenal' },
  { id: 'monthly', label: 'Mensual' },
  { id: 'quarterly', label: 'Trimestral' },
  { id: 'semiannual', label: 'Semestral' },
  { id: 'annual', label: 'Anual' },
] as const

export const OBLIGATION_PRIORITIES = [
  { id: 'low', label: 'Baja', color: 'muted' },
  { id: 'normal', label: 'Normal', color: 'info' },
  { id: 'high', label: 'Alta', color: 'warning' },
  { id: 'critical', label: 'Crítica', color: 'danger' },
] as const

export const WORK_ORDER_STATUSES = [
  { id: 'open', label: 'Abierta', color: 'blue' },
  { id: 'in_progress', label: 'En proceso', color: 'warning' },
  { id: 'completed', label: 'Completada', color: 'success' },
  { id: 'closed', label: 'Cerrada', color: 'muted' },
  { id: 'cancelled', label: 'Anulada', color: 'danger' },
] as const

export const SERVICE_TYPES = [
  { id: 'pintura', label: 'Pintura' },
  { id: 'latoneria', label: 'Latonería' },
  { id: 'detailing', label: 'Detailing' },
  { id: 'mecanica', label: 'Mecánica' },
  { id: 'electrica', label: 'Eléctrica' },
  { id: 'repuestos', label: 'Repuestos' },
  { id: 'otro', label: 'Otro' },
] as const

export const SIDEBAR_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Movimientos', href: '/movements', icon: 'ArrowLeftRight' },
  { label: 'Caja', href: '/cash', icon: 'Wallet' },
  { label: 'Bancos', href: '/banks', icon: 'Building2' },
  { label: 'Tesorería', href: '/treasury', icon: 'TrendingUp' },
  { section: 'Operaciones' },
  { label: 'Órdenes de Trabajo', href: '/work-orders', icon: 'Wrench' },
  { label: 'Ventas', href: '/sales', icon: 'ShoppingBag' },
  { label: 'Gastos', href: '/expenses', icon: 'Receipt' },
  { label: 'Compras', href: '/purchases', icon: 'Package' },
  { label: 'Proveedores', href: '/suppliers', icon: 'Users' },
  { section: 'Obligaciones' },
  { label: 'CxC', href: '/receivables', icon: 'ArrowDownLeft' },
  { label: 'CxP', href: '/payables', icon: 'ArrowUpRight' },
  { label: 'Obligaciones', href: '/obligations', icon: 'Scale' },
  { section: 'Patrimonio' },
  { label: 'Activos', href: '/assets', icon: 'Box' },
  { label: 'Documentos', href: '/documents', icon: 'FileText' },
  { section: 'Sistema' },
  { label: 'Auditoría', href: '/audit', icon: 'ShieldCheck' },
  { label: 'Reportes', href: '/reports', icon: 'BarChart3' },
  { label: 'Configuración', href: '/settings', icon: 'Settings' },
]
