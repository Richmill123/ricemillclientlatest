import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PurchaseItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Purchase {
  _id?: string;
  clientId: string;
  supplier: string;
  items: PurchaseItem[];
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PurchaseCreateRequest = Omit<Purchase, '_id' | 'createdAt' | 'updatedAt'>;
export type PurchaseUpdateRequest = Partial<Omit<Purchase, '_id' | 'createdAt' | 'updatedAt'>> & { clientId: string };

@Injectable({ providedIn: 'root' })
export class PurchaseService {
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

  getPurchases(): Observable<Purchase[]> {
    const clientId = this.getClientId();
    return this.http.get<Purchase[]>(`${this.apiUrl}/purchases?clientId=${encodeURIComponent(clientId)}`);
  }

  createPurchase(payload: PurchaseCreateRequest): Observable<Purchase> {
    return this.http.post<Purchase>(`${this.apiUrl}/purchases`, payload);
  }

  updatePurchase(id: string, payload: PurchaseUpdateRequest): Observable<Purchase> {
    return this.http.put<Purchase>(`${this.apiUrl}/purchases/${id}`, payload);
  }

  deletePurchase(id: string): Observable<unknown> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/purchases/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
