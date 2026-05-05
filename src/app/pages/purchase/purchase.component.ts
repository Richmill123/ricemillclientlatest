import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Purchase, PurchaseService } from '../../services/purchase.service';
import { PurchaseDialogResult, PurchaseFormDialogComponent } from './purchase-form-dialog/purchase-form-dialog.component';

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [
    AgGridModule,
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './purchase.component.html',
  styleUrls: ['./purchase.component.scss']
})
export class PurchaseComponent implements OnInit {
  private gridApi!: GridApi;
  public clientId = this.getClientId();

  rowData: Purchase[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'supplier', headerName: 'Supplier', sortable: true, filter: true, flex: 1, minWidth: 140 },
    {
      field: 'date', headerName: 'Date', sortable: true, filter: true, width: 130,
      valueFormatter: (p: ValueFormatterParams) => this.dateFormatter(p?.value)
    },
    {
      field: 'items', headerName: 'Items', sortable: false, filter: false, flex: 1, minWidth: 160,
      valueFormatter: (p: ValueFormatterParams) => {
        const items = p.value;
        if (!Array.isArray(items) || items.length === 0) return '-';
        return items.map((i: any) => `${i.description} (${i.quantity})`).join(', ');
      }
    },
    {
      field: 'totalAmount', headerName: 'Total Amount', sortable: true, filter: true, width: 150,
      valueFormatter: (p: ValueFormatterParams) => `₹${Number(p.value ?? 0).toLocaleString('en-IN')}`
    },
    {
      field: 'paymentStatus', headerName: 'Payment Status', sortable: true, filter: true, width: 150,
      cellRenderer: (p: ICellRendererParams) => {
        const status = String(p.value ?? '').toLowerCase();
        const colors: Record<string, string> = { paid: '#2e7d32', pending: '#e65100', partial: '#1565c0' };
        const color = colors[status] ?? '#666';
        return `<span style="color:${color};font-weight:600;text-transform:capitalize">${status}</span>`;
      }
    },
    {
      headerName: 'Actions', field: 'actions', sortable: false, filter: false, width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const div = document.createElement('div');
        div.className = 'gridActionBtnWrap';
        const editBtn = document.createElement('button');
        editBtn.className = 'mat-icon-button gridAction-edit';
        editBtn.style.color = '#3f51b5';
        editBtn.innerHTML = 'edit';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onEditClick(params.data?._id); });
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mat-icon-button gridAction-delete';
        deleteBtn.style.color = '#f44336';
        deleteBtn.innerHTML = 'delete';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onDeleteClick(params.data?._id, params.data?.supplier); });
        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      }
    }
  ];

  defaultColDef: ColDef = { flex: 1, minWidth: 100, resizable: true };

  constructor(
    private purchaseService: PurchaseService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar
  ) {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(term => {
      this.searchTerm = term;
      this.loadPurchases();
    });
  }

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const msg = error?.error?.message || error?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
  }

  ngOnInit(): void { this.loadPurchases(); }

  onGridReady(params: GridReadyEvent): void { this.gridApi = params.api; }

  onSearchChange(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  loadPurchases(): void {
    this.loading = true;
    this.purchaseService.getPurchases().subscribe({
      next: (data) => {
        let filtered = data || [];
        if (this.searchTerm) {
          const s = this.searchTerm.toLowerCase();
          filtered = filtered.filter((p: Purchase) =>
            (p.supplier || '').toLowerCase().includes(s) ||
            (p.paymentStatus || '').toLowerCase().includes(s) ||
            String(p.totalAmount ?? '').includes(this.searchTerm)
          );
        }
        this.rowData = filtered;
        if (this.gridApi) this.gridApi.setGridOption('rowData', filtered);
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open(this.getApiErrorMessage(error, 'Error loading purchases'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const dialogRef = this.dialog.open(PurchaseFormDialogComponent, {
      width: '800px', maxWidth: '96vw', disableClose: true, autoFocus: false,
      data: { isEdit: false }
    });
    dialogRef.afterClosed().subscribe((result?: PurchaseDialogResult) => {
      if (!result) return;
      this.purchaseService.createPurchase({ ...result, clientId: this.clientId }).subscribe({
        next: () => { this.snackBar.open('Purchase added successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] }); this.loadPurchases(); },
        error: (error) => this.snackBar.open(this.getApiErrorMessage(error, 'Error adding purchase'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
      });
    });
  }

  onEditClick(id?: string): void {
    if (!id) return;
    const purchase = this.rowData.find(p => p._id === id);
    if (!purchase) return;
    this.zone.run(() => {
      const dialogRef = this.dialog.open(PurchaseFormDialogComponent, {
        width: '800px', maxWidth: '96vw', disableClose: true, autoFocus: false,
        data: { isEdit: true, purchase: { ...purchase } }
      });
      dialogRef.afterClosed().subscribe((result?: PurchaseDialogResult) => {
        if (!result) return;
        this.purchaseService.updatePurchase(id, { ...result, clientId: this.clientId }).subscribe({
          next: () => { this.snackBar.open('Purchase updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] }); this.loadPurchases(); },
          error: (error) => this.snackBar.open(this.getApiErrorMessage(error, 'Error updating purchase'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
        });
      });
    });
  }

  onDeleteClick(id?: string, supplier?: string): void {
    if (!id) return;
    if (!confirm(`Delete purchase from "${supplier}"? This cannot be undone.`)) return;
    this.loading = true;
    this.purchaseService.deletePurchase(id).subscribe({
      next: () => { this.snackBar.open('Purchase deleted', 'Close', { duration: 3000, panelClass: ['success-snackbar'] }); this.loadPurchases(); },
      error: (error) => { this.snackBar.open(this.getApiErrorMessage(error, 'Error deleting purchase'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] }); this.loading = false; }
    });
  }

  private dateFormatter(value: unknown): string {
    if (!value) return '';
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN');
  }
}
