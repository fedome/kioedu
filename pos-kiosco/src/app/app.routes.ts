import { Routes } from '@angular/router';

import { ShellComponent } from './layout/shell/shell';
import { cashierGuard } from './core/auth/cashier.guard';

import { LoginComponent } from './features/auth/login/login';
import { HomeComponent } from './features/home/home';
import { CashSessionComponent } from './features/cash/cash-session';
import { SaleComponent } from './features/pos/sale/sale';
import { ProductListComponent } from './features/products/product-list/product-list';
import { TransactionsHistoryComponent } from './features/pos/transactions/transactions';
import { SettingsComponent } from './features/settings/settings';
import { ReportsComponent } from './features/reports/reports';
import { AuditFeedComponent } from './features/audit/audit';

export const routes: Routes = [
  // Login afuera del shell
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },

  // App adentro del shell
  {
    path: '',
    component: ShellComponent,
    canActivate: [cashierGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: HomeComponent },
      { path: 'cash-session', component: CashSessionComponent },
      { path: 'pos/sale', component: SaleComponent },
      { path: 'products', component: ProductListComponent },
      { path: 'transactions', component: TransactionsHistoryComponent },
      { path: 'suppliers', loadComponent: () => import('./features/suppliers/supplier-list/supplier-list.component').then(m => m.SupplierListComponent) },
      { path: 'categories', loadComponent: () => import('./features/categories/category-list/category-list').then(m => m.CategoryListComponent) }, // Lazy load
      { path: 'students', loadComponent: () => import('./features/students/student-list/student-list.component').then(m => m.StudentListComponent) },
      { path: 'students/:id', loadComponent: () => import('./features/students/student-details/student-details.component').then(m => m.StudentDetailsComponent) },
      { path: 'users', loadComponent: () => import('./features/users/user-list/user-list').then(m => m.UserListComponent) },
      { path: 'roles', loadComponent: () => import('./features/users/role-list/role-list').then(m => m.RoleListComponent) },
      { path: 'reports', component: ReportsComponent },
      { path: 'audit', component: AuditFeedComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'orders', loadComponent: () => import('./features/orders/purchase-list/purchase-list.component').then(m => m.PurchaseListComponent) },
      { path: 'calendar', loadComponent: () => import('./features/calendar/calendar-page.component').then(m => m.CalendarPageComponent) },
      { path: '**', redirectTo: 'home' },
    ],
  },
];

