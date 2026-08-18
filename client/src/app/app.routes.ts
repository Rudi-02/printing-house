import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/login').then(m => m.Login) },
  { path: 'admin-login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/admin-login').then(m => m.AdminLogin) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/register').then(m => m.Register) },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/forgot-password').then(m => m.ForgotPassword) },
  { path: 'reset-password/:token', loadComponent: () => import('./pages/auth/reset-password').then(m => m.ResetPassword) },
  { path: 'products/:id', loadComponent: () => import('./pages/product-details/product-details').then(m => m.ProductDetails) },

  // klijenti
  { path: 'client/profile', canActivate: [roleGuard('INDIVIDUAL', 'LEGAL')], loadComponent: () => import('./pages/client/client-profile').then(m => m.ClientProfile) },
  { path: 'client/search', canActivate: [roleGuard('INDIVIDUAL', 'LEGAL')], loadComponent: () => import('./pages/client/client-search').then(m => m.ClientSearch) },
  { path: 'client/prepare/:id', canActivate: [roleGuard('INDIVIDUAL', 'LEGAL')], loadComponent: () => import('./pages/client/prepare-product').then(m => m.PrepareProduct) },
  { path: 'client/cart', canActivate: [roleGuard('INDIVIDUAL', 'LEGAL')], loadComponent: () => import('./pages/client/cart').then(m => m.CartPage) },
  { path: 'client/archive', canActivate: [roleGuard('INDIVIDUAL', 'LEGAL')], loadComponent: () => import('./pages/client/archive').then(m => m.Archive) },
  { path: 'client/tenders', canActivate: [roleGuard('LEGAL')], loadComponent: () => import('./pages/client/client-tenders').then(m => m.ClientTenders) },

  // stampari
  { path: 'printer/profile', canActivate: [roleGuard('PRINTER')], loadComponent: () => import('./pages/printer/printer-profile').then(m => m.PrinterProfile) },
  { path: 'printer/products', canActivate: [roleGuard('PRINTER')], loadComponent: () => import('./pages/printer/printer-products').then(m => m.PrinterProducts) },
  { path: 'printer/stock', canActivate: [roleGuard('PRINTER')], loadComponent: () => import('./pages/printer/printer-stock').then(m => m.PrinterStock) },
  { path: 'printer/import', canActivate: [roleGuard('PRINTER')], loadComponent: () => import('./pages/printer/printer-import').then(m => m.PrinterImport) },
  { path: 'printer/orders', canActivate: [roleGuard('PRINTER')], loadComponent: () => import('./pages/printer/printer-orders').then(m => m.PrinterOrders) },
  { path: 'printer/tenders', canActivate: [roleGuard('PRINTER')], loadComponent: () => import('./pages/printer/printer-tenders').then(m => m.PrinterTenders) },

  // administrator
  { path: 'admin/users', canActivate: [roleGuard('ADMIN')], loadComponent: () => import('./pages/admin/admin-users').then(m => m.AdminUsers) },
  { path: 'admin/requests', canActivate: [roleGuard('ADMIN')], loadComponent: () => import('./pages/admin/admin-requests').then(m => m.AdminRequests) },
  { path: 'admin/categories', canActivate: [roleGuard('ADMIN')], loadComponent: () => import('./pages/admin/admin-categories').then(m => m.AdminCategories) },
  { path: 'admin/stats', canActivate: [roleGuard('ADMIN')], loadComponent: () => import('./pages/admin/admin-stats').then(m => m.AdminStats) },

  { path: '**', redirectTo: '' }
];
