/**
 * 💡 BRANDED TYPES: Seguridad nominal en tiempo de compilación.
 * Evita la asignación accidental entre distintos tipos de IDs de MongoDB.
 */
export type BusinessOwnerId = string & { readonly __brand: 'BusinessOwnerId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type BranchId = string & { readonly __brand: 'BranchId' };
export type ProductId = string & { readonly __brand: 'ProductId' };
export type CategoryId = string & { readonly __brand: 'CategoryId' };
export type InventoryAdjustmentId = string & { readonly __brand: 'InventoryAdjustmentId' };
export type SaleId = string & { readonly __brand: 'SaleId' };
export type PurchaseId = string & { readonly __brand: 'PurchaseId' };
export type CashShiftId = string & { readonly __brand: 'CashShiftId' };
export type StockTransferId = string & { readonly __brand: 'StockTransferId' };

/**
 * 📦 CONFIGURACIÓN DE ROLES Y PERMISOS (SaaS Multi-tenant)
 */
export type UserRole = 'admin' | 'customer' | 'employee';

export type UserPermission =
  | 'pos_access'
  | 'inventory_access'
  | 'purchases_access'
  | 'staff_management'
  | 'finances_access';

export interface UserProfile {
  _id: UserId;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermission[];
  customer_id: BusinessOwnerId; // Contexto de aislamiento del inquilino
  salesStats?: {
    transactionCount: number;
    totalVolumeUSD: number;
  };
}

/**
 * 🏬 ESTRUCTURA DE SUCURSALES (Soft-Delete compatible)
 */
export interface Branch {
  _id: BranchId;
  name: string;
  address?: string;         // Dirección física — opcional según configuración del comercio
  owner_id: BusinessOwnerId;
  is_active: boolean; // Control de sucursal fantasma
  createdAt: string;
  updatedAt: string;
}

/**
 * 🏷️ TAXONOMÍA DE PRODUCTOS
 */
export interface Category {
  _id: CategoryId;
  name: string;
  user: BusinessOwnerId;
}

/**
 * 📊 CONTROL DE STOCK POR SUCURSAL (Sub-esquema Atómico)
 */
export interface BranchInventory {
  _id: string;
  branch_id: BranchId;
  product_id: ProductId;
  stock: number;       // Admite enteros y flotantes (granel)
  min_stock: number;   // Para alertas de stock crítico (< 5 unidades)
  createdAt: string;
  updatedAt: string;
}

/**
 * 🍎 ENTIDAD CENTRAL: PRODUCTO
 * Mapea el contrato exacto tras corregir la trampa del virtual populate.
 */
export type UnitType = 'unidad' | 'kg' | 'litro' | 'metro';

export interface Product {
  _id: ProductId;
  id: ProductId; // Duplicado por Mongoose toJSON virtuals
  name: string;
  description: string;
  barcode?: string;
  price: number; // Siempre expresado en USD base
  category: CategoryId | Category; // Puede venir ID o Poblado según query
  unit_type: UnitType;
  user: BusinessOwnerId;
  isActive?: boolean;   // Soft-delete: false = producto archivado, ausente = activo
  createdAt: string;
  updatedAt: string;
  __v: number;

  // 🚨 Los campos cruciales parchados en la refactorización:
  branchInventories: BranchInventory[]; // Poblado dinámicamente post-commit
  totalStock: number;                   // Calculado por el .reduce() del backend
}

/**
 * 💸 LOGÍSTICA DE TRANSACCIONES: COMPRAS A PROVEEDORES
 *
 * El modelo Mongoose almacena `due_date` (snake_case).
 * El frontend JSX consume ambas convenciones (`dueDate`, `due_date`) según
 * cómo el controller serialice; los tipos admiten las dos para evitar
 * casteos forzados.
 */
export type PurchaseDbStatus = 'PENDING' | 'PARTIAL' | 'PAID';

/** Ítem de detalle que devuelve el backend (PurchaseDetail poblado) */
export interface PurchaseDetailItem {
  _id: string;
  purchase_id: PurchaseId;
  product_id: ProductId | { _id: ProductId; name: string };
  quantity: number;
  unit_cost: number;
  createdAt?: string;
}

/**
 * Entidad Purchase tal como la devuelve la API (lista y detalle).
 * El backend guarda `due_date`, pero el controller de creación recibe `dueDate`.
 */
export interface Purchase {
  _id: PurchaseId;
  admin_id: UserId | { _id: UserId; name: string; email: string };
  branch_id: BranchId;
  supplier: string;
  total_cost: number;
  paid_amount: number;
  status: PurchaseDbStatus;
  due_date?: string;
  dueDate?: string;          // Alias frontend — el JSX lo consume así
  exchange_rate?: number | null;
  payment_date?: string;
  date?: string;
  createdAt: string;
  updatedAt?: string;

  // Campos inyectados solo por fetchPurchaseById (populated)
  items?: PurchaseDetailItem[];
}

/** Respuesta del endpoint GET /purchases/:id */
export interface PurchaseWithDetails {
  purchase: Purchase;
  details: PurchaseDetailItem[];
}

/**
 * 🛍️ LOGÍSTICA DE TRANSACCIONES: VENTAS (POS/TPV)
 */
export type PaymentMethod = 'Efectivo' | 'Divisas' | 'Tarjeta' | 'Pago Movil' | 'Pago Móvil' | 'Transferencia' | 'Zelle' | 'Punto de Venta';

export interface SaleItem {
  product_id: ProductId;
  quantity: number;
  unit_price: number;
}

export interface Sale {
  _id: SaleId;
  total_amount: number;
  exchange_rate: number | null;
  payment_method: PaymentMethod;
  status: 'pending' | 'completed' | 'cancelled' | 'Anulada';
  sold_by: UserId | { _id: UserId; name: string } | null;
  branch_id: BranchId;
  items: SaleItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface SaleDetailItemDTO {
  product_id: {
    _id: ProductId;
    name: string;
    unit_type?: string;
  } | null;
  quantity: number;
  unit_price: number;
}

export interface SaleDetailDTO {
  _id: SaleId;
  total_amount: number;
  exchange_rate: number | null;
  payment_method: PaymentMethod;
  status: 'pending' | 'completed' | 'cancelled' | 'Anulada';
  sold_by: { _id: UserId; name: string } | null;
  branch_id: BranchId;
  items: SaleDetailItemDTO[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * 🪵 AUDITORÍA DE INVENTARIO (Kardex de Ajustes Manuales)
 */
export type AdjustmentReason = 'initial_count' | 'merma' | 'robo' | 'vencimiento' | 'correccion';

export interface InventoryAdjustment {
  _id: InventoryAdjustmentId;
  actor_id: UserId;
  branch_id: BranchId;
  product_id: ProductId;
  quantity: number;        // Puede ser positivo o negativo
  reason: AdjustmentReason;
  comment: string;
  createdAt: string;
}

/**
 * 🇻🇪 MONEDA Y TASAS DE CAMBIO (Contexto Multidivisa VE)
 */
export interface ExchangeRate {
  _id: string;
  customer_id: BusinessOwnerId;
  rate: number;            // Monto en Bs por cada 1 USD (Tasa única diaria)
  date: string;            // Formato YYYY-MM-DD ajustado a huso VE
  createdAt: string;
}

/**
 * 🎛️ RESPUESTAS ESTÁNDAR DE LA API (HTTP Wrapper)
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  fromCache?: boolean;     // Metadata de Redis Upstash
  data: T;                 // Payload dinámico tipado
}

// Variación específica para endpoints que envuelven la entidad en una llave
export interface ApiProductResponse {
  success: boolean;
  product: Product;
  message?: string;
  fromCache?: boolean;
}

export interface ApiProductListResponse {
  success: boolean;
  products: Product[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

/**
 * 💵 TURNO DE CAJA (CASH SHIFT)
 */
export interface ICashShift {
  _id: CashShiftId;
  branch_id: BranchId;
  user_id: UserId;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
  
  // Fondo Inicial de Caja (Multi-divisa)
  initial_cash: {
    USD: number;
    COP: number;
    BS: number;
  };

  // Resumen del Sistema (Calculado exclusivamente Server-Side via MongoDB Aggregations)
  system_summary: {
    cash_sales: { USD: number; COP: number; BS: number };
    card_sales: { USD: number; COP: number; BS: number };
    transfer_sales: { USD: number; COP: number; BS: number };
    cash_inflows: { USD: number; COP: number; BS: number };
    cash_outflows: { USD: number; COP: number; BS: number };
    expected_cash: { USD: number; COP: number; BS: number };
  };

  // Arqueo Físico Declarado por el Cajero al Cierre
  declared_amounts?: {
    cash: { USD: number; COP: number; BS: number };
    card_bouchers: { USD: number; COP: number; BS: number };
    transfers: { USD: number; COP: number; BS: number };
  };

  // Reconciliación y Discrepancias
  discrepancy?: {
    cash_difference: { USD: number; COP: number; BS: number }; // Declared - Expected
    card_difference: { USD: number; COP: number; BS: number };
    has_discrepancy: boolean;
    notes?: string;
  };
}

/**
 * 🚚 TRANSFERENCIAS DE STOCK ENTRE SUCURSALES (Stock Transfers)
 */
export interface StockTransferItem {
  product_id: ProductId | Product;
  quantity: number;
}

export interface IStockTransfer {
  _id: StockTransferId;
  customer_id: BusinessOwnerId;
  
  // Origen y Destino
  source_branch_id: BranchId | Branch;
  destination_branch_id: BranchId | Branch;
  
  // Actores involucrados
  created_by: UserId | UserProfile;
  received_by?: UserId | UserProfile;
  
  // Contenido
  items: StockTransferItem[];
  
  // Estado y Trazabilidad
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  
  // Fechas
  createdAt: string;
  updatedAt: string;
}
