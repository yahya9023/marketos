export const languageOptions = [
  { code: 'es', label: 'Español' },
] as const;

export type Language = 'es' | 'en' | 'fr' | 'it' | 'zh';
export type ActiveLanguage = (typeof languageOptions)[number]['code'];
export const languageCookie = 'marketos-language';

type Dictionary = Record<string, string>;

const es: Dictionary = {
  Unavailable: 'No disponible', 'Processing...': 'Procesando...',
  Dashboard: 'Panel', POS: 'TPV', Products: 'Productos', Inventory: 'Inventario', Sales: 'Ventas', Employees: 'Empleados', Stores: 'Tiendas', Categories: 'Categorías', Logout: 'Cerrar sesión',
  'Current store:': 'Tienda actual:', 'Language:': 'Idioma:', 'Daily operations': 'Operaciones diarias', DashboardTitle: 'Panel', 'Loading dashboard...': 'Cargando panel...', "Today's sales": 'Ventas de hoy', 'CASH today': 'EFECTIVO hoy', 'CARD today': 'TARJETA hoy', 'Products / stock': 'Productos / stock', 'at zero stock': 'sin existencias', 'Latest activity': 'Actividad reciente', 'Recent sales': 'Ventas recientes', 'View all': 'Ver todo', 'No completed sales yet.': 'Aún no hay ventas completadas.',
  'Item lookup': 'Búsqueda de artículos', 'Scan products': 'Escanear productos', 'Scan or enter barcode': 'Escanea o introduce el código de barras', 'Scan barcode or type product name': 'Escanea el código o escribe el nombre', 'Quick add': 'Añadir rápido', 'Shopping cart': 'Carrito', 'Current sale': 'Venta actual', 'Clear cart': 'Vaciar carrito', Product: 'Producto', Qty: 'Cant.', Total: 'Total', Remove: 'Eliminar', 'Available stock': 'Stock disponible', availableStock: 'Stock disponible: {count}', 'OUT OF STOCK': 'SIN EXISTENCIAS', Subtotal: 'Subtotal', VAT: 'IVA', CASH: 'EFECTIVO', CARD: 'TARJETA', processingPayment: 'Procesando pago {method}...', addedToCart: '{name} añadido al carrito', 'Pay with cash': 'Pagar en efectivo', 'Tap or insert card': 'Acerca o inserta la tarjeta', 'This product is out of stock.': 'Este producto no tiene existencias.', 'No product found': 'Producto no encontrado', 'Cart is empty. Scan an item to begin.': 'El carrito está vacío. Escanea un artículo para comenzar.', 'Add an item before checkout': 'Añade un artículo antes de cobrar', 'Sale completed successfully': 'Venta completada correctamente', 'Scanner ready': 'Escáner listo', 'Last sync: just now': 'Última sincronización: ahora',
  'Catalog control': 'Control del catálogo', 'Search by name or barcode': 'Buscar por nombre o código de barras', 'Products:': 'Productos:', 'All products': 'Todos los productos', 'Assigned to this store': 'Asignados a esta tienda', 'Not assigned to this store': 'No asignados a esta tienda', Assigned: 'Asignado', 'Add to store': 'Añadir a la tienda', Barcode: 'Código de barras', Category: 'Categoría', Price: 'Precio', Unit: 'Unidad', Stock: 'Stock', Status: 'Estado', Actions: 'Acciones', Active: 'Activo', Inactive: 'Inactivo', Edit: 'Editar', Close: 'Cerrar', Cancel: 'Cancelar', 'Create product': 'Crear producto', 'Save changes': 'Guardar cambios', 'Create employee': 'Crear empleado', 'Edit employee': 'Editar empleado', 'Create store': 'Crear tienda', 'Edit store': 'Editar tienda', 'Add Store': 'Añadir tienda', 'Add stock': 'Añadir stock', Name: 'Nombre', Email: 'Correo electrónico', Password: 'Contraseña', Role: 'Rol', Store: 'Tienda', Address: 'Dirección', Currency: 'Moneda', Created: 'Creado', 'Select store': 'Seleccionar tienda', 'Select category': 'Seleccionar categoría', 'Category name': 'Nombre de categoría', Save: 'Guardar', 'Add category': 'Añadir categoría', Activate: 'Activar', Deactivate: 'Desactivar', 'Product image': 'Imagen del producto', 'Upload product image': 'Subir imagen del producto', 'Remove image': 'Eliminar imagen', 'No products found.': 'No se encontraron productos.', 'Loading products...': 'Cargando productos...', 'Loading inventory...': 'Cargando inventario...', 'No employees found.': 'No se encontraron empleados.', 'Loading employees...': 'Cargando empleados...', 'No stores found.': 'No se encontraron tiendas.', 'Loading stores...': 'Cargando tiendas...', 'No sales match your filters.': 'Ninguna venta coincide con los filtros.', 'Loading sales...': 'Cargando ventas...', 'Sale details': 'Detalles de la venta', Payment: 'Pago', 'Grand total': 'Total general', 'Active employee': 'Empleado activo', 'Active store': 'Tienda activa',
  'Unauthorized': 'No autorizado', 'Access denied': 'Acceso denegado', 'You do not have permission to access this area.': 'No tienes permiso para acceder a esta sección.', 'Go to POS': 'Ir al TPV', 'Welcome back': 'Te damos la bienvenida', 'Sign in to continue to MarketOS.': 'Inicia sesión para continuar en MarketOS.', 'Invalid email or password.': 'Correo o contraseña no válidos.', 'Sign in': 'Iniciar sesión', 'Signing in...': 'Iniciando sesión...',
};

const overrides: Record<Language, Dictionary> = {
  es,
  en: { Dashboard: 'Dashboard', POS: 'POS', Products: 'Products', Inventory: 'Inventory', Sales: 'Sales', Employees: 'Employees', Stores: 'Stores', Categories: 'Categories', Logout: 'Log out', 'Current store:': 'Current store:', 'Language:': 'Language:', DashboardTitle: 'Dashboard', 'All products': 'All products', 'Assigned to this store': 'Assigned to this store', 'Not assigned to this store': 'Not assigned to this store', Assigned: 'Assigned', 'Add to store': 'Add to store', 'Available stock': 'Available stock', availableStock: 'Available stock: {count}', 'OUT OF STOCK': 'OUT OF STOCK', processingPayment: 'Processing {method} payment...', addedToCart: '{name} added to cart' },
  fr: { Dashboard: 'Tableau de bord', POS: 'Caisse', Products: 'Produits', Inventory: 'Inventaire', Sales: 'Ventes', Employees: 'Employés', Stores: 'Magasins', Categories: 'Catégories', Logout: 'Déconnexion', 'Current store:': 'Magasin actuel :', 'Language:': 'Langue :', DashboardTitle: 'Tableau de bord', 'All products': 'Tous les produits', 'Assigned to this store': 'Assignés à ce magasin', 'Not assigned to this store': 'Non assignés à ce magasin', Assigned: 'Assigné', 'Add to store': 'Ajouter au magasin', 'Available stock': 'Stock disponible', availableStock: 'Stock disponible : {count}', 'OUT OF STOCK': 'RUPTURE DE STOCK', processingPayment: 'Paiement {method} en cours...', addedToCart: '{name} ajouté au panier' },
  it: { Dashboard: 'Dashboard', POS: 'Cassa', Products: 'Prodotti', Inventory: 'Inventario', Sales: 'Vendite', Employees: 'Dipendenti', Stores: 'Negozi', Categories: 'Categorie', Logout: 'Esci', 'Current store:': 'Negozio attuale:', 'Language:': 'Lingua:', DashboardTitle: 'Dashboard', 'All products': 'Tutti i prodotti', 'Assigned to this store': 'Assegnati a questo negozio', 'Not assigned to this store': 'Non assegnati a questo negozio', Assigned: 'Assegnato', 'Add to store': 'Aggiungi al negozio', 'Available stock': 'Scorte disponibili', availableStock: 'Scorte disponibili: {count}', 'OUT OF STOCK': 'ESAURITO', processingPayment: 'Pagamento {method} in corso...', addedToCart: '{name} aggiunto al carrello' },
  zh: { Dashboard: '仪表板', POS: '收银台', Products: '商品', Inventory: '库存', Sales: '销售', Employees: '员工', Stores: '门店', Categories: '分类', Logout: '退出登录', 'Current store:': '当前门店：', 'Language:': '语言：', DashboardTitle: '仪表板', 'All products': '所有商品', 'Assigned to this store': '已分配到此门店', 'Not assigned to this store': '未分配到此门店', Assigned: '已分配', 'Add to store': '添加到门店', 'Available stock': '可用库存', availableStock: '可用库存：{count}', 'OUT OF STOCK': '缺货', processingPayment: '正在处理{method}付款...', addedToCart: '{name}已加入购物车' },
};

export function isLanguage(value: string | undefined): value is ActiveLanguage {
  return languageOptions.some((option) => option.code === value);
}

export function getDictionary(language: Language): Dictionary {
  return { ...es, ...(overrides[language] ?? {}) };
}

export function translate(language: Language, key: string) {
  return getDictionary(language)[key] ?? key;
}

export function translateWithValues(language: Language, key: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce((message, [name, value]) => message.replaceAll(`{${name}}`, String(value)), translate(language, key));
}
