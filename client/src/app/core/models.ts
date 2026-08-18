export type Role = 'INDIVIDUAL' | 'LEGAL' | 'PRINTER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  _id: string; username: string; firstName: string; lastName: string;
  phone: string; email: string; profileImage: string;
  role: Role; status: UserStatus;
  institutionName?: string; address?: string; city?: string;
  companyNumber?: string; pib?: string; lat?: number; lng?: number;
  createdAt?: string;
}

export interface Subcategory { _id: string; name: string; }
export interface Category { _id: string; name: string; subcategories: Subcategory[]; }

export interface PrintService {
  _id?: string; name: string; maxWidth: number; maxHeight: number; extraPrice: number;
}

export interface ProductRow {
  _id: string; name: string; price: number; quantity: number; mainImage: string;
  likes: number; dislikes: number; categoryName: string; subcategoryName: string;
  printerName: string; city: string;
}

export interface ProductComment {
  _id: string; username: string; text: string; createdAt: string;
  reaction: 'LIKE' | 'DISLIKE' | 'NONE'; mine: boolean;
}

export interface ProductDetails {
  _id: string; name: string; likes: number; dislikes: number;
  mainImage: string; images: string[];
  categoryName: string; subcategoryName: string;
  printerId: string | null; printerName: string; city: string;
  comments: ProductComment[];
  extended: boolean;
  description?: string; price?: number; quantity?: number;
  colors?: string[]; services?: PrintService[];
  address?: string; lat?: number | null; lng?: number | null;
}

export interface Product {
  _id: string; name: string; description: string; price: number; quantity: number;
  colors: string[]; category: Category | string; subcategoryId?: string;
  subcategoryName?: string; mainImage: string; images: string[];
  services: PrintService[]; likes: number; dislikes: number; active: boolean;
}

export interface CartItem {
  _id: string; product: string; printer: string; productName: string;
  quantity: number; color: string; serviceName: string;
  unitPrice: number; totalPrice: number;
  customText: string; customImage: string;
}
export interface CartGroup {
  printerId: string; printerName: string; city: string;
  items: CartItem[]; subtotal: number;
}
export interface CartView { groups: CartGroup[]; total: number; }

export interface InvoiceItem {
  _id: string; product: string; productName: string; quantity: number;
  color: string; serviceName: string; unitPrice: number; totalPrice: number;
  customText: string; customImage: string; itemStatus: string;
}
export interface Invoice {
  _id: string; invoiceNumber: string; client: any; printer: string;
  printerName: string; city: string; items: InvoiceItem[];
  total: number; status: string; paid: boolean;
  orderedAt: string; receivedAt?: string;
}

export interface ArchiveRow {
  invoiceId: string; invoiceNumber: string; itemId: string; productId: string;
  productName: string; quantity: number; printerName: string; city: string;
  orderedAt: string; status: string; total: number;
}

export interface TenderItem {
  _id: string; productName: string; quantity: number;
  color: string; serviceName: string;
}
export interface Tender {
  _id: string; tenderNumber: string; clientName: string;
  openedAt: string; closesAt: string; status: string;
  items: TenderItem[]; bids?: any[];
  winnerPrinter?: string; alreadyBid?: boolean;
}

export interface PublicStats {
  printersCount: number;
  topProducts: { _id: string; name: string; likes: number; dislikes: number; mainImage: string; printerName: string; city: string; }[];
}
