import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './api';
import {
  ArchiveRow, CartView, Category, Invoice, Product, ProductDetails,
  ProductRow, PublicStats, Tender, User
} from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  /* ---------- javno ---------- */
  publicStats() { return this.http.get<PublicStats>(`${API_URL}/public/stats`); }
  activeCategories() { return this.http.get<Category[]>(`${API_URL}/public/categories`); }
  searchProducts(p: { name?: string; category?: string; sort?: string; dir?: string }) {
    const q = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
    return this.http.get<ProductRow[]>(`${API_URL}/public/products?${q.toString()}`);
  }
  productDetails(id: string) { return this.http.get<ProductDetails>(`${API_URL}/public/products/${id}`); }

  /* ---------- profil ---------- */
  getProfile() { return this.http.get<User>(`${API_URL}/profile`); }
  updateProfile(fd: FormData) { return this.http.put<{ message: string; user: User }>(`${API_URL}/profile`, fd); }
  changePassword(oldPassword: string, newPassword: string) {
    return this.http.put<{ message: string }>(`${API_URL}/profile/password`, { oldPassword, newPassword });
  }

  /* ---------- kategorije ---------- */
  categories() { return this.http.get<Category[]>(`${API_URL}/categories`); }
  createCategory(name: string) { return this.http.post<Category>(`${API_URL}/categories`, { name }); }
  addSubcategory(id: string, name: string) { return this.http.post<Category>(`${API_URL}/categories/${id}/subcategories`, { name }); }
  deleteCategory(id: string) { return this.http.delete<{ message: string }>(`${API_URL}/categories/${id}`); }

  /* ---------- stampar ---------- */
  myProducts() { return this.http.get<Product[]>(`${API_URL}/printer/products`); }
  createProduct(fd: FormData) { return this.http.post<Product>(`${API_URL}/printer/products`, fd); }
  updateProduct(id: string, fd: FormData) { return this.http.put<{ message: string }>(`${API_URL}/printer/products/${id}`, fd); }
  updateQuantity(id: string, quantity: number) {
    return this.http.patch<{ message: string }>(`${API_URL}/printer/products/${id}/quantity`, { quantity });
  }
  deleteProduct(id: string) { return this.http.delete<{ message: string }>(`${API_URL}/printer/products/${id}`); }
  importProducts(fd: FormData) {
    return this.http.post<{ message: string; created: { _id: string; name: string }[]; skipped: any[] }>(
      `${API_URL}/printer/products/import`, fd);
  }
  uploadProductImages(id: string, fd: FormData) {
    return this.http.post<{ message: string }>(`${API_URL}/printer/products/${id}/images`, fd);
  }
  printerOrders() { return this.http.get<Invoice[]>(`${API_URL}/printer/orders`); }
  advanceOrder(id: string) { return this.http.patch<{ message: string }>(`${API_URL}/printer/orders/${id}/status`, {}); }
  openTenders() { return this.http.get<Tender[]>(`${API_URL}/printer/tenders`); }
  myBids() { return this.http.get<any[]>(`${API_URL}/printer/tenders/mine`); }
  submitBid(id: string, lines: any[]) {
    return this.http.post<{ message: string; total: number }>(`${API_URL}/printer/tenders/${id}/bid`, { lines });
  }

  /* ---------- korpa i narudzbine ---------- */
  cart() { return this.http.get<CartView>(`${API_URL}/cart`); }
  addToCart(fd: FormData) { return this.http.post<{ message: string }>(`${API_URL}/cart`, fd); }
  removeCartItem(itemId: string) { return this.http.delete<{ message: string }>(`${API_URL}/cart/${itemId}`); }
  clearCart() { return this.http.delete<{ message: string }>(`${API_URL}/cart`); }

  checkout() { return this.http.post<{ message: string; invoices: Invoice[] }>(`${API_URL}/orders/checkout`, {}); }
  pay(body: any) { return this.http.post<{ message: string }>(`${API_URL}/orders/pay`, body); }
  myOrders() { return this.http.get<Invoice[]>(`${API_URL}/orders`); }
  cancelOrder(id: string) { return this.http.delete<{ message: string }>(`${API_URL}/orders/${id}`); }
  archive() { return this.http.get<ArchiveRow[]>(`${API_URL}/archive`); }
  markReceived(id: string) { return this.http.patch<{ message: string }>(`${API_URL}/orders/${id}/received`, {}); }
  rate(productId: string, value: 'LIKE' | 'DISLIKE', text: string) {
    return this.http.post<{ message: string; likes: number; dislikes: number }>(`${API_URL}/ratings`, { productId, value, text });
  }
  invoicePdfUrl(id: string) { return `${API_URL}/orders/${id}/pdf`; }
  downloadInvoice(id: string) { return this.http.get(`${API_URL}/orders/${id}/pdf`, { responseType: 'blob' }); }

  /* ---------- javne nabavke (pravno lice) ---------- */
  openTender() { return this.http.post<{ message: string; tender: Tender }>(`${API_URL}/tenders`, {}); }
  myTenders() { return this.http.get<Tender[]>(`${API_URL}/tenders`); }
  downloadTenderReport(id: string) { return this.http.get(`${API_URL}/tenders/${id}/report`, { responseType: 'blob' }); }

  /* ---------- administrator ---------- */
  adminUsers(params: { role?: string; status?: string } = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
    return this.http.get<User[]>(`${API_URL}/admin/users?${q.toString()}`);
  }
  pendingUsers() { return this.http.get<User[]>(`${API_URL}/admin/users/pending`); }
  approveUser(id: string) { return this.http.patch<{ message: string }>(`${API_URL}/admin/users/${id}/approve`, {}); }
  rejectUser(id: string, reason: string) { return this.http.patch<{ message: string }>(`${API_URL}/admin/users/${id}/reject`, { reason }); }
  adminUpdateUser(id: string, body: any) { return this.http.put<{ message: string }>(`${API_URL}/admin/users/${id}`, body); }
  adminDeleteUser(id: string) { return this.http.delete<{ message: string }>(`${API_URL}/admin/users/${id}`); }
  statsOverview() { return this.http.get<any>(`${API_URL}/admin/stats/overview`); }
  statsRevenue() { return this.http.get<{ printerName: string; revenue: number; orders: number }[]>(`${API_URL}/admin/stats/revenue`); }
  statsTopProducts() { return this.http.get<{ productName: string; quantity: number; percentage: number }[]>(`${API_URL}/admin/stats/top-products`); }
  statsRatingTrend() { return this.http.get<{ productName: string; points: { date: string; score: number }[] }[]>(`${API_URL}/admin/stats/rating-trend`); }
}
