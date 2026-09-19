import { Component, NgZone } from '@angular/core';
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
import { SuspenseRecord, SuspenseService } from '../../services/suspense.service';
import { AuthService } from '../../services/auth.service';
import { SuspenseDialogResult, SuspenseFormDialogComponent } from './suspense-form-dialog/suspense-form-dialog.component';

@Component({
  selector: 'app-suspense',
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
  templateUrl: './suspense.component.html',
  styleUrl: './suspense.component.scss'
})
export class SuspenseComponent {

  private gridApi!: GridApi;
  get clientId(): string { return this.auth.getClientId(); }

  rowData: SuspenseRecord[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'employeeId', headerName: 'Employee Id', sortable: true, filter: true, flex: 1 },
    { field: 'employeeName', headerName: 'Employee Name', sortable: true, filter: true, flex: 1 },
    {
      field: 'totalDebt',
      headerName: 'Total Debt',
      sortable: true,
      filter: true,
      width: 150,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'totalAdvance',
      headerName: 'Total Advance',
      sortable: true,
      filter: true,
      width: 160,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'date',
      headerName: 'Date',
      sortable: true,
      filter: true,
      width: 140,
      valueFormatter: (params) => this.dateFormatter(params?.value)
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
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onDeleteClick(params.data?._id, params.data?.employeeName); });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      }
    }
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true
  };

  constructor(
    private suspenseService: SuspenseService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar,
    private auth: AuthService
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.loadSuspense();
    });
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const msg = error?.error?.message || error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    return fallback;
  }

  ngOnInit(): void {
    this.loadSuspense();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onSearchChange(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  loadSuspense(): void {
    this.loading = true;
    this.suspenseService.getSuspense().subscribe({
      next: (data) => {
        let filteredData = data || [];

        if (this.searchTerm) {
          const searchLower = this.searchTerm.toLowerCase();
          filteredData = filteredData.filter((s: SuspenseRecord) =>
            (s.employeeId || '').toLowerCase().includes(searchLower) ||
            (s.employeeName || '').toLowerCase().includes(searchLower) ||
            String(s.totalDebt ?? '').includes(this.searchTerm) ||
            String(s.totalAdvance ?? '').includes(this.searchTerm) ||
            String(s.date ?? '').includes(this.searchTerm)
          );
        }

        this.rowData = filteredData;
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', filteredData);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading suspense:', error);
        this.snackBar.open(this.getApiErrorMessage(error, 'Error loading suspense'), 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const dialogRef = this.dialog.open(SuspenseFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: { isEdit: false }
    });

    dialogRef.afterClosed().subscribe((result?: SuspenseDialogResult) => {
      if (!result) return;
      this.suspenseService.createSuspense({
        ...result,
        clientId: this.clientId
      }).subscribe({
        next: () => {
          this.snackBar.open('Suspense added successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadSuspense();
        },
        error: (error) => {
          console.error('Error adding suspense:', error);
          this.snackBar.open(error?.error?.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    });
  }

  onEditClick(id?: string): void {
    if (!id) return;
    const record = this.rowData.find(s => s._id === id);
    if (!record) {
      this.snackBar.open('Suspense record not found', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }
    this.zone.run(() => {
      const dialogRef = this.dialog.open(SuspenseFormDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        disableClose: true,
        autoFocus: false,
        data: { isEdit: true, record: { ...record } }
      });

      dialogRef.afterClosed().subscribe((result?: SuspenseDialogResult) => {
        if (!result) return;
        this.loading = true;
        this.suspenseService.updateSuspense(id, {
          ...result,
          clientId: this.clientId
        }).subscribe({
          next: () => {
            this.snackBar.open('Suspense updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadSuspense();
          },
          error: (error) => {
            console.error('Error updating suspense:', error);
            this.snackBar.open(error?.error?.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
            this.loading = false;
          }
        });
      });
    });
  }

  onDeleteClick(id?: string, employeeName?: string): void {
    if (!id) return;
    if (!confirm(`Are you sure you want to delete suspense${employeeName ? ` for ${employeeName}` : ''}? This action cannot be undone.`)) return;
    this.loading = true;
    this.suspenseService.deleteSuspense(id).subscribe({
      next: () => {
        this.snackBar.open('Suspense deleted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadSuspense();
      },
      error: (error) => {
        console.error('Error deleting suspense:', error);
        this.snackBar.open(this.getApiErrorMessage(error, 'Error deleting suspense. Please try again.'), 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  private currencyFormatter(params: ValueFormatterParams): string {
    const value = Number(params.value ?? 0);
    return `₹${value.toLocaleString('en-IN')}`;
  }

  private dateFormatter(value: unknown): string {
    if (!value) return '';
    const s = String(value);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-IN');
  }
}
