import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Employee {
  _id?: string;
  name: string;
  gender: string;
  address: string;
  dob: string;
  phoneNumber: string;
  emergencyContactNumber: string;
  maritalStatus: string;
  salary: number;
  debtAmount?: number;
  advanceAmount?: number;
  clientId: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
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

  getEmployees(): Observable<Employee[]> {
    const clientId = this.getClientId();
    return this.http.get<Employee[]>(`${this.apiUrl}/employees?clientId=${encodeURIComponent(clientId)}`);
  }

  createEmployee(employee: Omit<Employee, '_id'>): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/employees`, employee);
  }

  updateEmployee(id: string, employee: Partial<Omit<Employee, '_id'>>): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/employees/${id}`, {
      ...employee,
      clientId: this.getClientId()
    });
  }

  deleteEmployee(id: string): Observable<any> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/employees/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
