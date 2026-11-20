import { Routes } from '@angular/router';
import { authGuard, requireRoleGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'capture',
      },
      {
        path: 'capture',
        loadComponent: () => import('./features/capture/capture.component').then((m) => m.CaptureComponent),
      },
      {
        path: 'expenses',
        loadComponent: () => import('./features/expenses/expenses.component').then((m) => m.ExpensesComponent),
      },
      {
        path: 'accounting',
        canActivate: [requireRoleGuard(2, 3)],
        loadComponent: () => import('./features/accounting/accounting.component').then((m) => m.AccountingComponent),
      },
      {
        path: 'users',
        canActivate: [requireRoleGuard(3)],
        loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'capture',
  },
];
