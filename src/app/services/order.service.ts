import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Order {
  _id: string;
  clientId: string;
  name: string;
  villageName: string;
  address: string;
  phoneNumber: string;
  numberOfBags: number;
  totalAmount: number;
  advanceAmount: number;
  typeOfPaddy: string;
  splittingincome?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
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

  getOrders(): Observable<Order[]> {
    const clientId = this.getClientId();
    return this.http.get<Order[]>(`${this.apiUrl}/orders?clientId=${encodeURIComponent(clientId)}`);
  }

  createOrder(order: Omit<Order, '_id' | 'createdAt' | 'updatedAt'>): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, order);
  }

  updateOrder(id: string, order: Partial<Omit<Order, '_id' | 'createdAt' | 'updatedAt'>>): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${id}`, {
      ...order,
      clientId: this.getClientId()
    });
  }

  deleteOrder(id: string): Observable<any> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/orders/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
