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
import { Income, IncomeService } from '../../services/income.service';
import { IncomeDialogResult, IncomeFormDialogComponent } from './income-form-dialog/income-form-dialog.component';

@Component({
  selector: 'app-income',
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
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss'
})
export class IncomeComponent implements OnInit {
  private gridApi!: GridApi;
  public clientId = this.getClientId();

  rowData: Income[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'item', headerName: 'Item', sortable: true, filter: true, flex: 1 },
    { field: 'description', headerName: 'Description', sortable: true, filter: true, flex: 1 },
    { field: 'category', headerName: 'Category', sortable: true, filter: true, width: 140 },
    {
      field: 'amount', headerName: 'Amount', sortable: true, filter: true, width: 140,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'date', headerName: 'Date', sortable: true, filter: true, width: 140,
      valueFormatter: (params) => this.dateFormatter(params?.value)
    },
    { field: 'paymentMethod', headerName: 'Payment', sortable: true, filter: true, width: 160 },
    { field: 'receiptNumber', headerName: 'Receipt', sortable: true, filter: true, width: 160 },
    {
      headerName: 'Actions', field: 'actions', sortable: false, filter: false, width: 120,
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
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onDeleteClick(params.data?._id, params.data?.item); });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      }
    }
  ];

  defaultColDef: ColDef = { flex: 1, minWidth: 100, resizable: true };

  constructor(
    private incomeService: IncomeService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar
  ) {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(term => {
      this.searchTerm = term;
      this.loadIncome();
    });
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const msg = error?.error?.message || error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    return fallback;
  }

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  ngOnInit(): void { this.loadIncome(); }

  onGridReady(params: GridReadyEvent): void { this.gridApi = params.api; }

  onSearchChange(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  loadIncome(): void {
    this.loading = true;
    this.incomeService.getIncome().subscribe({
      next: (data) => {
        let filtered = data || [];
        if (this.searchTerm) {
          const s = this.searchTerm.toLowerCase();
          filtered = filtered.filter((e: Income) =>
            (e.item || '').toLowerCase().includes(s) ||
            (e.description || '').toLowerCase().includes(s) ||
            (e.category || '').toLowerCase().includes(s) ||
            (e.paymentMethod || '').toLowerCase().includes(s) ||
            (e.receiptNumber || '').toLowerCase().includes(s) ||
            String(e.amount ?? '').includes(this.searchTerm) ||
            String(e.date ?? '').includes(this.searchTerm)
          );
        }
        this.rowData = filtered;
        if (this.gridApi) this.gridApi.setGridOption('rowData', filtered);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading income:', error);
        this.snackBar.open(this.getApiErrorMessage(error, 'Error loading income'), 'Close', {
          duration: 3000, panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const dialogRef = this.dialog.open(IncomeFormDialogComponent, {
      width: '700px', maxWidth: '95vw', disableClose: true, autoFocus: false,
      data: { isEdit: false }
    });

    dialogRef.afterClosed().subscribe((result?: IncomeDialogResult) => {
      if (!result) return;
      this.incomeService.createIncome({ ...result, clientId: this.clientId }).subscribe({
        next: () => {
          this.snackBar.open('Income added successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadIncome();
        },
        error: (error) => {
          this.snackBar.open(this.getApiErrorMessage(error, 'Error adding income'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    });
  }

  onEditClick(id?: string): void {
    if (!id) return;
    const income = this.rowData.find(e => e._id === id);
    if (!income) {
      this.snackBar.open('Income record not found', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }
    this.zone.run(() => {
      const dialogRef = this.dialog.open(IncomeFormDialogComponent, {
        width: '700px', maxWidth: '95vw', disableClose: true, autoFocus: false,
        data: { isEdit: true, income: { ...income } }
      });

      dialogRef.afterClosed().subscribe((result?: IncomeDialogResult) => {
        if (!result) return;
        this.loading = true;
        this.incomeService.updateIncome(id, { ...result, clientId: this.clientId }).subscribe({
          next: () => {
            this.snackBar.open('Income updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadIncome();
          },
          error: (error) => {
            this.snackBar.open(this.getApiErrorMessage(error, 'Error updating income'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
            this.loading = false;
          }
        });
      });
    });
  }

  onDeleteClick(id?: string, item?: string): void {
    if (!id) return;
    if (!confirm(`Are you sure you want to delete income${item ? ` for "${item}"` : ''}? This action cannot be undone.`)) return;
    this.loading = true;
    this.incomeService.deleteIncome(id).subscribe({
      next: () => {
        this.snackBar.open('Income deleted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadIncome();
      },
      error: (error) => {
        this.snackBar.open(this.getApiErrorMessage(error, 'Error deleting income'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  private currencyFormatter(params: ValueFormatterParams): string {
    return `₹${Number(params.value ?? 0).toLocaleString('en-IN')}`;
  }

  private dateFormatter(value: unknown): string {
    if (!value) return '';
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN');
  }
}
