import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Stock {
  _id?: string;
  itemType: string;
  availableQuantity: number;
  clientId: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class StockService {
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

  getStocks(): Observable<Stock[]> {
    const clientId = this.getClientId();
    return this.http.get<Stock[]>(`${this.apiUrl}/stock?clientId=${encodeURIComponent(clientId)}`);
  }

  createStock(stock: Omit<Stock, '_id' | 'createdAt' | 'updatedAt'>): Observable<Stock> {
    return this.http.post<Stock>(`${this.apiUrl}/stock`, stock);
  }

  updateStock(id: string, updateData: { quantity: number; clientId: string }): Observable<Stock> {
    return this.http.put<Stock>(`${this.apiUrl}/stock/${id}`, updateData);
  }

  deleteStock(id: string): Observable<any> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/stock/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
