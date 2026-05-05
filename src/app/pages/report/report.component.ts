import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridOptions
} from 'ag-grid-community';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'Order' | 'Wages' | 'Sales' | 'Expense' | 'Stocking' | 'Income' | 'Purchase' | 'Billing';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent {

  @ViewChild('agGrid') agGrid!: AgGridAngular;
  isSearchClicked = false;
  private gridApi!: GridApi;

  reportTypes: ReportType[] = ['Order', 'Wages', 'Sales', 'Expense', 'Stocking', 'Income', 'Purchase', 'Billing'];
  selectedType: ReportType = 'Order';

  startDate: Date = new Date();
  endDate: Date = new Date();

  rowData: any[] = [];
  columnDefs: ColDef[] = [];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 120
  };

  gridOptions: GridOptions = {
    animateRows: true,
    pagination: true,
    paginationPageSize: 10,
    rowHeight: 42,
    headerHeight: 48
  };

  clientId: string = '';

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    const user = sessionStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.clientId = parsed._id || parsed;
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  // ── Item formatters ─────────────────────────────────────────────────────────

  private formatSaleItems(items: any): string {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items
      .map((i: any) => {
        const type = String(i?.itemType ?? '').trim();
        const qty  = Number(i?.quantity ?? 0);
        const rate = Number(i?.rate ?? 0);
        const amt  = Number(i?.amount ?? 0);
        if (!type) return '';
        return `${type}: ${qty} x ₹${rate} = ₹${amt}`;
      })
      .filter(Boolean)
      .join(' | ');
  }

  private formatPurchaseItems(items: any): string {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items
      .map((i: any) => {
        const desc  = String(i?.description ?? '').trim();
        const qty   = Number(i?.quantity ?? 0);
        const price = Number(i?.unitPrice ?? 0);
        const total = Number(i?.totalPrice ?? qty * price);
        if (!desc) return '';
        return `${desc}: ${qty} x ₹${price} = ₹${total}`;
      })
      .filter(Boolean)
      .join(' | ');
  }

  private formatBillingItems(items: any): string {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items
      .map((i: any) => {
        const desc = String(i?.description ?? '').trim();
        const qty  = Number(i?.quantity ?? 0);
        const rate = Number(i?.rate ?? 0);
        const amt  = Number(i?.amount ?? qty * rate);
        if (!desc) return '';
        return `${desc}: ${qty} x ₹${rate} = ₹${amt}`;
      })
      .filter(Boolean)
      .join(' | ');
  }

  private formatDate(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN');
  }

  private formatCurrency(value: any): string {
    const n = Number(value ?? 0);
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatCellValue(field: string, value: any): string {
    if (value === null || value === undefined) return '';

    if (field === 'items') {
      if (this.selectedType === 'Purchase') return this.formatPurchaseItems(value);
      if (this.selectedType === 'Billing')  return this.formatBillingItems(value);
      return this.formatSaleItems(value);
    }

    if (['totalAmount', 'unitPrice', 'totalPrice', 'rate', 'amount', 'salary', 'totalWage'].includes(field)) {
      return this.formatCurrency(value);
    }

    if (['purchaseDate', 'invoiceDate', 'date', 'createdAt', 'updatedAt'].includes(field) || value instanceof Date) {
      return this.formatDate(value);
    }

    if (typeof value === 'object') return JSON.stringify(value);

    return String(value);
  }

  // ── Column setup ────────────────────────────────────────────────────────────

  private getPurchaseColumns(): ColDef[] {
    return [
      { headerName: 'Date',              field: 'purchaseDate',  minWidth: 110, valueFormatter: p => this.formatDate(p.value) },
      { headerName: 'Supplier',          field: 'supplier',      minWidth: 150, flex: 1 },
      { headerName: 'Items',             field: 'items',         minWidth: 260, flex: 2, valueFormatter: p => this.formatPurchaseItems(p.value), wrapText: false },
      { headerName: 'Total Amount (₹)',  field: 'totalAmount',   minWidth: 140, valueFormatter: p => this.formatCurrency(p.value) },
      { headerName: 'Payment Status',    field: 'paymentStatus', minWidth: 130,
        cellRenderer: (p: any) => {
          const v = String(p.value ?? '').toLowerCase();
          const map: Record<string, string> = { paid: 'badge-success', pending: 'badge-warning', partial: 'badge-info' };
          const cls = map[v] ?? 'badge-neutral';
          return `<span class="badge ${cls}" style="text-transform:capitalize">${p.value ?? ''}</span>`;
        }
      },
    ];
  }

  private getBillingColumns(): ColDef[] {
    return [
      { headerName: 'Invoice #',         field: 'invoiceNo',     minWidth: 110 },
      { headerName: 'Date',              field: 'invoiceDate',   minWidth: 110, valueFormatter: p => this.formatDate(p.value) },
      { headerName: 'Customer',          field: 'customerName',  minWidth: 150, flex: 1 },
      { headerName: 'Items',             field: 'items',         minWidth: 260, flex: 2, valueFormatter: p => this.formatBillingItems(p.value), wrapText: false },
      { headerName: 'Total Amount (₹)',  field: 'totalAmount',   minWidth: 140, valueFormatter: p => this.formatCurrency(p.value) },
      { headerName: 'Status',            field: 'status',        minWidth: 110,
        cellRenderer: (p: any) => {
          const v = String(p.value ?? '').toLowerCase();
          const map: Record<string, string> = { paid: 'badge-success', sent: 'badge-info', draft: 'badge-neutral', unpaid: 'badge-warning', partial: 'badge-warning' };
          const cls = map[v] ?? 'badge-neutral';
          return `<span class="badge ${cls}" style="text-transform:capitalize">${p.value ?? ''}</span>`;
        }
      },
      { headerName: 'Notes',             field: 'notes',         minWidth: 160, flex: 1 },
    ];
  }

  private setupGridColumns(sampleData: any): void {
    if (!sampleData) return;

    if (this.selectedType === 'Purchase') {
      this.columnDefs = this.getPurchaseColumns();
    } else if (this.selectedType === 'Billing') {
      this.columnDefs = this.getBillingColumns();
    } else {
      this.columnDefs = Object.keys(sampleData)
        .filter(key => !['_id', 'clientId', '__v', 'recordedBy', 'updatedAt'].includes(key))
        .map(key => ({
          headerName: this.formatHeader(key),
          field: key,
          valueFormatter: (params: any) => this.formatCellValue(key, params.value)
        }));
    }

    setTimeout(() => {
      if (this.gridApi) {
        this.gridApi.setGridOption('columnDefs', this.columnDefs);
        this.gridApi.setGridOption('rowData', this.rowData);
        this.gridApi.sizeColumnsToFit();
      }
    });
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  onSearch(): void {
    if (!this.clientId) return;
    this.isSearchClicked = true;

    const formatDate = (date: Date) =>
      `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    const start = formatDate(this.startDate);
    const end   = formatDate(this.endDate);

    let apiUrl = '';

    switch (this.selectedType) {
      case 'Order':    apiUrl = `${this.baseUrl}/orders`;    break;
      case 'Wages':    apiUrl = `${this.baseUrl}/wages`;     break;
      case 'Sales':    apiUrl = `${this.baseUrl}/sales`;     break;
      case 'Expense':  apiUrl = `${this.baseUrl}/expenses`;  break;
      case 'Stocking': apiUrl = `${this.baseUrl}/stock`;     break;
      case 'Income':   apiUrl = `${this.baseUrl}/income`;    break;
      case 'Purchase': apiUrl = `${this.baseUrl}/purchases`; break;
      case 'Billing':  apiUrl = `${this.baseUrl}/billing`;   break;
    }

    apiUrl += `?clientId=${this.clientId}&startDate=${start}&endDate=${end}`;

    this.rowData = [];
    this.columnDefs = [];

    this.http.get<any[]>(apiUrl).subscribe({
      next: data => {
        this.rowData = data || [];
        if (data?.length) {
          this.setupGridColumns(data[0]);
        } else {
          // For typed reports show columns even with no data
          if (this.selectedType === 'Purchase') {
            this.columnDefs = this.getPurchaseColumns();
          } else if (this.selectedType === 'Billing') {
            this.columnDefs = this.getBillingColumns();
          }
        }
      },
      error: err => console.error('API Error:', err)
    });
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  exportToPDF(): void {
    const doc = new jsPDF('landscape');

    doc.setFontSize(18);
    doc.text(`${this.selectedType} Report`, 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Date Range: ${this.startDate.toLocaleDateString('en-IN')} - ${this.endDate.toLocaleDateString('en-IN')}`,
      14, 23
    );

    // Build columns excluding badge-rendered ones for PDF (use plain text)
    const columns = this.columnDefs
      .filter(c => c.field && c.field !== 'actions')
      .map(c => ({ header: c.headerName as string, dataKey: c.field as string }));

    const rows = this.rowData.map(row => {
      const r: any = {};
      columns.forEach(c => {
        r[c.dataKey] = this.formatCellValue(c.dataKey, row[c.dataKey]);
      });
      return r;
    });

    autoTable(doc, {
      columns,
      body: rows,
      startY: 30,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
      columnStyles: {
        // Give items column extra width
        items: { cellWidth: 80 }
      }
    });

    doc.save(`${this.selectedType}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  exportToCSV(): void {
    this.gridApi.exportDataAsCsv({
      fileName: `${this.selectedType}_Report_${new Date().toISOString().slice(0, 10)}`,
      processCellCallback: (params: any) => this.formatCellValue(params.column.getColId(), params.value)
    });
  }

  private formatHeader(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
}
