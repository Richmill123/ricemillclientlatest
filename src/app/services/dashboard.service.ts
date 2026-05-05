import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type DashboardItemType = 'bran' | 'husk' | 'black rice' | 'broken rice' | 'Karika' | 'other';

export interface AmountQuantity {
  quantity: number;
  amount: number;
}

export interface RevenueSummary {
  orders: number;
  sales: number;
  billing: number;
  total: number;
}

export interface ExpenseSummary {
  wages: number;
  salary: number;
  other: number;
  purchase: number;
  total: number;
}

export interface SalesByItemType {
  [key: string]: AmountQuantity;
}

export interface StockAvailable {
  [key: string]: number;
}

export interface OrderStatus {
  totalBags: number;
  count: number;
}

/** Dynamic dictionary: keys are the actual status strings stored in the DB */
export type OrderStatuses = Record<string, OrderStatus>;

export interface DashboardMonth {
  month: number;
  revenue: RevenueSummary & { billing?: number };
  expense: ExpenseSummary & { purchase?: number };
  profit: number;
  sales: {
    byItemType: SalesByItemType;
  };
}

export interface DashboardResponse {
  revenue: RevenueSummary;
  expense: ExpenseSummary;
  profit: number;
  todaySummary: {
    totalOrder: number;
    paddyTaken: number;
    newOrder: number;
    output: number;
  };
  paddyProcessed: {
    totalBags: number;
    paidBags: number;
  };
  sales: {
    byItemType: SalesByItemType;
  };
  stock: {
    available: StockAvailable;
  };
  orderStatuses: OrderStatuses;
  yearly: {
    year: number;
    months: DashboardMonth[];
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  getDashboard(): Observable<DashboardResponse> {
    const clientId = this.getClientId();
    return this.http.get<DashboardResponse>(`${this.apiUrl}/admins/dashboard?clientId=${encodeURIComponent(clientId)}`);
  }
}
