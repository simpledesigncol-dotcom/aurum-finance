export const MOVEMENT_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  PURCHASE: 'purchase',
  TRANSFER: 'transfer',
  OBLIGATION_RECEIVED: 'obligation_received',
  OBLIGATION_PAYMENT: 'obligation_payment',
  AR_PAYMENT: 'ar_payment',
  AP_PAYMENT: 'ap_payment',
  ASSET_PURCHASE: 'asset_purchase',
  CAPITAL_CONTRIBUTION: 'capital_contribution',
  ADJUSTMENT: 'adjustment',
} as const

export const MOVEMENT_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  purchase: 'Compra',
  transfer: 'Transferencia',
  obligation_received: 'Préstamo recibido',
  obligation_payment: 'Pago de préstamo',
  ar_payment: 'Pago de cliente',
  ap_payment: 'Pago a proveedor',
  asset_purchase: 'Compra de activo',
  capital_contribution: 'Aporte de capital',
  adjustment: 'Ajuste',
}

export const EVENT_TYPES = [
  { id: 'sale', label: 'Vendí algo', icon: '💰', color: 'green' },
  { id: 'purchase', label: 'Compré algo', icon: '🛒', color: 'orange' },
  { id: 'expense', label: 'Pagué algo', icon: '📤', color: 'red' },
  { id: 'ar_payment', label: 'Me pagaron', icon: '📥', color: 'blue' },
  { id: 'obligation_received', label: 'Me prestaron', icon: '🤝', color: 'purple' },
  { id: 'obligation_payment', label: 'Pagué deuda', icon: '🏦', color: 'purple' },
  { id: 'transfer', label: 'Transferí', icon: '🔄', color: 'gray' },
  { id: 'capital_contribution', label: 'Aporte capital', icon: '📈', color: 'green' },
  { id: 'adjustment', label: 'Ajuste', icon: '📊', color: 'gray' },
] as const

export const PAYMENT_TYPES = [
  { id: 'cash', label: 'Efectivo', icon: '💵' },
  { id: 'nequi', label: 'Nequi', icon: '📱' },
  { id: 'daviplata', label: 'Daviplata', icon: '📱' },
  { id: 'tc', label: 'Tarjeta crédito', icon: '💳' },
  { id: 'td', label: 'Tarjeta débito', icon: '💳' },
  { id: 'transfer', label: 'Transferencia', icon: '🏦' },
  { id: 'credit', label: 'Crédito', icon: '📝' },
  { id: 'partial', label: 'Parcial', icon: '🔀' },
] as const

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Arriendo', type: 'expense', icon: '🏠' },
  { name: 'Servicios públicos', type: 'expense', icon: '💡' },
  { name: 'Internet/Telecomunicaciones', type: 'expense', icon: '🌐' },
  { name: 'Materiales de limpieza', type: 'expense', icon: '🧹' },
  { name: 'Herramientas y repuestos', type: 'expense', icon: '🔧' },
  { name: 'Transporte/domicilio', type: 'expense', icon: '🚗' },
  { name: 'Marketing y publicidad', type: 'expense', icon: '📢' },
  { name: 'Mantenimiento equipos', type: 'expense', icon: '⚙️' },
  { name: 'Seguros', type: 'expense', icon: '🛡️' },
  { name: 'Suscripciones', type: 'expense', icon: '📦' },
  { name: 'Nómina', type: 'expense', icon: '👥' },
  { name: 'Otros gastos', type: 'expense', icon: '📋' },
]

export const DEFAULT_SERVICE_CATEGORIES = [
  { name: 'Lavado Básico', type: 'service', icon: '🚿' },
  { name: 'Lavado Premium', type: 'service', icon: '✨' },
  { name: 'Full Detailing', type: 'service', icon: '🏆' },
  { name: 'Pulido', type: 'service', icon: '💫' },
  { name: 'Ceramic Coating', type: 'service', icon: '🛡️' },
  { name: 'PPF', type: 'service', icon: '🔮' },
  { name: 'Membership', type: 'service', icon: '👑' },
  { name: 'Flota', type: 'service', icon: '🏢' },
  { name: 'Venta productos', type: 'product', icon: '🧴' },
]

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

export const OBLIGATION_STATUSES = [
  { id: 'pending', label: 'Pendiente', color: 'muted' },
  { id: 'upcoming', label: 'Próximo', color: 'info' },
  { id: 'due_today', label: 'Vence hoy', color: 'warning' },
  { id: 'overdue', label: 'Vencida', color: 'danger' },
  { id: 'paid', label: 'Pagada', color: 'success' },
  { id: 'cancelled', label: 'Cancelada', color: 'muted' },
] as const

export const AGREEMENT_SERVICE_TYPES = [
  { id: 'pintura', label: 'Pintura' },
  { id: 'latoneria', label: 'Latonería' },
] as const

export const AGREEMENT_ITEM_STATUS = [
  { id: 'pending', label: 'Pendiente', color: 'muted' },
  { id: 'in_progress', label: 'En proceso', color: 'warning' },
  { id: 'completed', label: 'Completado', color: 'info' },
  { id: 'invoiced', label: 'Facturado', color: 'purple' },
  { id: 'paid', label: 'Pagado', color: 'success' },
] as const

export const AGREEMENT_STATUS = [
  { id: 'active', label: 'Activo', color: 'success' },
  { id: 'suspended', label: 'Suspendido', color: 'warning' },
  { id: 'terminated', label: 'Terminado', color: 'muted' },
] as const

export const SETTLEMENT_DIRECTION = [
  { id: 'aurum_to_contractor', label: 'Aurum → Contratista' },
  { id: 'contractor_to_aurum', label: 'Contratista → Aurum' },
] as const

export const ASSET_TYPES = [
  { id: 'equipment', label: 'Equipo/herramienta' },
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'furniture', label: 'Mobiliario' },
  { id: 'real_estate', label: 'Inmueble' },
  { id: 'software', label: 'Software/licencia' },
] as const

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  AUXILIARY: 'auxiliary',
  VIEWER: 'viewer',
} as const

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  accountant: 'Contador',
  auxiliary: 'Auxiliar',
  viewer: 'Observador',
}

export const SIDEBAR_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Caja', href: '/cash', icon: 'Wallet' },
  { label: 'Bancos', href: '/banks', icon: 'Building2' },
  { label: 'Tesorería', href: '/treasury', icon: 'TrendingUp' },
  { section: 'Operaciones' },
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
