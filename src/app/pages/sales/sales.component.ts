import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Sale, SaleItem, SalesService } from '../../services/sales.service';
import { SalesDialogResult, SalesFormDialogComponent } from './sales-form-dialog/sales-form-dialog.component';
import { PreferenceService } from '../../services/preference.service';

@Component({
  selector: 'app-sales',
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
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss']
})
export class SalesComponent {
  private gridApi!: GridApi;
  public clientId = this.getClientId();

  rowData: Sale[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Customer', sortable: true, filter: true, minWidth: 130, flex: 1 },
    { field: 'phoneNumber', headerName: 'Phone', sortable: true, filter: true, width: 130 },
    {
      headerName: 'Items',
      field: 'items',
      sortable: false,
      filter: false,
      minWidth: 160,
      flex: 1.5,
      valueGetter: (params: any) => this.formatItems(params.data?.items)
    },
    {
      field: 'totalAmount', headerName: 'Total (₹)', sortable: true, filter: true, width: 120,
      valueFormatter: (p: any) => `₹${Number(p.value ?? 0).toLocaleString('en-IN')}`
    },
    {
      field: 'mydebt', headerName: 'My Debt (₹)', sortable: true, filter: true, width: 120,
      valueFormatter: (p: any) => `₹${Number(p.value ?? 0).toLocaleString('en-IN')}`
    },
    {
      field: 'paymentStatus', headerName: 'Status', sortable: true, filter: true, width: 120,
      cellRenderer: (p: ICellRendererParams) => {
        const s = String(p.value ?? '').toLowerCase();
        const map: Record<string, { bg: string; color: string }> = {
          paid:            { bg: '#dcfce7', color: '#166534' },
          'partially paid':{ bg: '#fef9c3', color: '#854d0e' },
          pending:         { bg: '#fee2e2', color: '#991b1b' },
        };
        const c = map[s] ?? { bg: '#f1f5f9', color: '#475569' };
        return `<span style="background:${c.bg};color:${c.color};padding:2px 9px;border-radius:12px;font-size:11px;font-weight:600;text-transform:capitalize">${p.value ?? '-'}</span>`;
      }
    },
    { field: 'paymentMethod', headerName: 'Method', sortable: true, filter: true, width: 110 },
    {
      field: 'createdAt', headerName: 'Date',
      filter: 'agDateColumnFilter', valueFormatter: this.dateFormatter,
      sortable: true, width: 110
    },
    {
      headerName: 'Actions',
      field: 'actions',
      sortable: false,
      filter: false,
      width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const div = document.createElement('div');
        div.className = 'gridActionBtnWrap';

        const editBtn = document.createElement('button');
        editBtn.className = 'mat-icon-button gridAction-edit';
        editBtn.innerHTML = 'edit';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onEditClick(params.data?._id); });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mat-icon-button gridAction-delete';
        deleteBtn.innerHTML = 'delete';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onDeleteClick(params.data?._id); });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      }
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 80,
    suppressSizeToFit: false,
  };

  constructor(
    private salesService: SalesService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar,
    private prefService: PreferenceService,
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.loadSales();
    });
  }

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch {
      return '';
    }
  }
  dateFormatter(params: any): string {
    if (!params?.value) return '-';
    const d = new Date(params.value);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN');
  }
  ngOnInit(): void {
    if (!this.prefService.snapshot) this.prefService.load().subscribe();
    this.loadSales();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onSearchChange(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  loadSales(): void {
    this.loading = true;
    this.salesService.getSales().subscribe({
      next: (data) => {
        let filteredData = data || [];

        if (this.searchTerm) {
          const searchLower = this.searchTerm.toLowerCase();
          filteredData = filteredData.filter((s: Sale) =>
            (s.name || '').toLowerCase().includes(searchLower) ||
            (s.phoneNumber || '').toLowerCase().includes(searchLower) ||
            (s.address || '').toLowerCase().includes(searchLower) ||
            (s.paymentStatus || '').toLowerCase().includes(searchLower) ||
            (s.paymentMethod || '').toLowerCase().includes(searchLower) ||
            this.formatItems(s.items).toLowerCase().includes(searchLower)
          );
        }

        this.rowData = filteredData;
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', filteredData);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading sales:', error);
        this.snackBar.open('Error loading sales', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const dialogRef = this.dialog.open(SalesFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: { isEdit: false, itemTypes: this.prefService.getOutputTypes() }
    });

    dialogRef.afterClosed().subscribe((result?: SalesDialogResult) => {
      if (!result) return;
      this.salesService.createSale({
        ...result,
        clientId: this.clientId
      }).subscribe({
        next: () => {
          this.snackBar.open('Sale added successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadSales();
        },
        error: (error) => {
          console.error('Error adding sale:', error);
          this.snackBar.open(error?.error?.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    });
  }

  onEditClick(id?: string): void {
    if (!id) return;
    const sale = this.rowData.find(s => s._id === id);
    if (!sale) {
      this.snackBar.open('Sale not found', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }
    this.zone.run(() => {
      const dialogRef = this.dialog.open(SalesFormDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        disableClose: true,
        autoFocus: false,
        data: { isEdit: true, sale: { ...sale }, itemTypes: this.prefService.getOutputTypes() }
      });

      dialogRef.afterClosed().subscribe((result?: SalesDialogResult) => {
        if (!result) return;
        this.loading = true;
        this.salesService.updateSale(id, {
          ...result,
          clientId: this.clientId
        }).subscribe({
          next: () => {
            this.snackBar.open('Sale updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadSales();
          },
          error: (error) => {
            console.error('Error updating sale:', error);
            this.snackBar.open(error?.error?.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
            this.loading = false;
          }
        });
      });
    });
  }

  onDeleteClick(id?: string): void {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this sale? This action cannot be undone.')) return;
    this.loading = true;
    this.salesService.deleteSale(id).subscribe({
      next: () => {
        this.snackBar.open('Sale deleted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadSales();
      },
      error: (error) => {
        console.error('Error deleting sale:', error);
        this.snackBar.open('Error deleting sale. Please try again.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  formatItems(items: SaleItem[] | undefined): string {
    if (!items || items.length === 0) return '';
    return items.map(i => `${i.itemType} (${i.quantity})`).join(', ');
  }
}
