import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SaleItemType = 'bran' | 'husk' | 'black rice' | 'broken rice' | 'Karika' | 'others';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Paid';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export interface SaleItem {
  itemType: SaleItemType;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Sale {
  _id?: string;
  clientId: string;
  name: string;
  phoneNumber: string;
  address: string;
  items: SaleItem[];
  totalAmount: number;
  mydebt: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt?: string;
  updatedAt?: string;
}

export type SaleCreateRequest = Omit<Sale, '_id' | 'createdAt' | 'updatedAt'>;
export type SaleUpdateRequest = Omit<Sale, '_id' | 'createdAt' | 'updatedAt'>;

@Injectable({ providedIn: 'root' })
export class SalesService {
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

  getSales(): Observable<Sale[]> {
    const clientId = this.getClientId();
    return this.http.get<Sale[]>(`${this.apiUrl}/sales?clientId=${encodeURIComponent(clientId)}`);
  }

  createSale(payload: SaleCreateRequest): Observable<Sale> {
    return this.http.post<Sale>(`${this.apiUrl}/sales`, payload);
  }

  updateSale(id: string, payload: SaleUpdateRequest): Observable<Sale> {
    return this.http.put<Sale>(`${this.apiUrl}/sales/${id}`, payload);
  }

  deleteSale(id: string): Observable<unknown> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/sales/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
