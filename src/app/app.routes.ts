import { Routes } from '@angular/router';
import { DashboardComponent }  from './pages/dashboard/dashboard.component';
import { OrderComponent }      from './pages/order/order.component';
import { EmployeeComponent }   from './pages/employee/employee.component';
import { StockingComponent }   from './pages/stocking/stocking.component';
import { SalesComponent }      from './pages/sales/sales.component';
import { WagesComponent }      from './pages/wages/wages.component';
import { ExpenseComponent }    from './pages/expense/expense.component';
import { ReportComponent }     from './pages/report/report.component';
import { LoginComponent }      from './pages/auth/login/login.component';
import { IncomeComponent }     from './pages/income/income.component';
import { PurchaseComponent }   from './pages/purchase/purchase.component';
import { BillingComponent }    from './pages/billing/billing.component';
import { PreferenceComponent } from './pages/preference/preference.component';
import { authGuard }           from './guards/auth.guard';

const guarded = { canActivate: [authGuard] };

export const routes: Routes = [
  { path: '',           redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',      component: LoginComponent,      title: 'Login' },
  { path: 'dashboard',  component: DashboardComponent,  title: 'Dashboard',       ...guarded },
  { path: 'employees',  component: EmployeeComponent,   title: 'Employees',       ...guarded },
  { path: 'expenses',   component: ExpenseComponent,    title: 'Expenses',        ...guarded },
  { path: 'orders',     component: OrderComponent,      title: 'Orders',          ...guarded },
  { path: 'reports',    component: ReportComponent,     title: 'Reports',         ...guarded },
  { path: 'sales',      component: SalesComponent,      title: 'Sales',           ...guarded },
  { path: 'stock',      component: StockingComponent,   title: 'Stock',           ...guarded },
  { path: 'wages',      component: WagesComponent,      title: 'Wages',           ...guarded },
  { path: 'income',     component: IncomeComponent,     title: 'Income',          ...guarded },
  { path: 'purchases',  component: PurchaseComponent,   title: 'Purchases',       ...guarded },
  { path: 'billing',    component: BillingComponent,    title: 'Billing',         ...guarded },
  { path: 'preferences',component: PreferenceComponent, title: 'Preferences',     ...guarded },
  { path: '**',         redirectTo: '/dashboard' }
];
