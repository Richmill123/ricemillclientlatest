import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BillingItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Billing {
  _id?: string;
  clientId: string;
  invoiceNo?: string;    // auto-generated sequential (INV0001, INV0002, …)
  customerName: string;
  items: BillingItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  date?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BillingCreateRequest = Omit<Billing, '_id' | 'createdAt' | 'updatedAt'>;
export type BillingUpdateRequest = Partial<Omit<Billing, '_id' | 'createdAt' | 'updatedAt'>> & { clientId: string };

@Injectable({ providedIn: 'root' })
export class BillingService {
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

  getBillings(): Observable<Billing[]> {
    const clientId = this.getClientId();
    return this.http.get<Billing[]>(`${this.apiUrl}/billing?clientId=${encodeURIComponent(clientId)}`);
  }

  createBilling(payload: BillingCreateRequest): Observable<Billing> {
    return this.http.post<Billing>(`${this.apiUrl}/billing`, payload);
  }

  updateBilling(id: string, payload: BillingUpdateRequest): Observable<Billing> {
    return this.http.put<Billing>(`${this.apiUrl}/billing/${id}`, payload);
  }

  deleteBilling(id: string): Observable<unknown> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/billing/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
