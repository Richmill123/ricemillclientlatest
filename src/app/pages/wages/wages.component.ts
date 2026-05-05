import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Wage, WagesService } from '../../services/wages.service';
import { WagesDialogResult, WagesFormDialogComponent } from './wages-form-dialog/wages-form-dialog.component';

@Component({
  selector: 'app-wages',
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
  templateUrl: './wages.component.html',
  styleUrl: './wages.component.scss'
})
export class WagesComponent {
  private gridApi!: GridApi;
  public clientId = this.getClientId();

  rowData: Wage[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'employeeName', headerName: 'Employee', sortable: true, filter: true, flex: 1 },
    {
      field: 'advanceWage',
      headerName: 'Advance',
      sortable: true,
      filter: true,
      width: 140,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'advanceamount',
      headerName: 'Debt',
      sortable: true,
      filter: true,
      width: 140,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'totalWage',
      headerName: 'Total',
      sortable: true,
      filter: true,
      width: 140,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'advancedebtamount',
      headerName: 'Advance Debt',
      sortable: true,
      filter: true,
      width: 120,
      valueFormatter: this.currencyFormatter
    },
    {
      field: 'pendingamount',
      headerName: 'Pending Amount',
      sortable: true,
      filter: true,
      width: 140,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    { field: 'typeOfWork', headerName: 'Work Type', sortable: true, filter: true, width: 130 },
    { field: 'machineType', headerName: 'Machine', sortable: true, filter: true, width: 130 },
    {
      field: 'date',
      headerName: 'Date',
      sortable: true,
      filter: true,
      width: 130,
      valueFormatter: (params) => this.dateFormatter(params?.value)
    },
    {
      headerName: 'Actions',
      field: 'actions',
      sortable: false,
      filter: false,
      width: 150,
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
    private wagesService: WagesService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.loadWages();
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
    } catch {
      return '';
    }
  }

  ngOnInit(): void {
    this.loadWages();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onSearchChange(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  loadWages(): void {
    this.loading = true;
    this.wagesService.getWages().subscribe({
      next: (data) => {
        let filteredData = data || [];
filteredData = data.map(w => ({
  ...w,
  pendingamount: String(
    (w.totalWage ?? 0) -
    (w.advanceWage ?? 0))
}));

        if (this.searchTerm) {
          const searchLower = this.searchTerm.toLowerCase();
          filteredData = filteredData.filter((w: Wage) =>
            (w.employeeName || '').toLowerCase().includes(searchLower) ||
            (w.typeOfWork || '').toLowerCase().includes(searchLower) ||
            (w.machineType || '').toLowerCase().includes(searchLower) ||
            (w.note || '').toLowerCase().includes(searchLower) ||
            String(w.totalWage ?? '').includes(this.searchTerm) ||
            String(w.advanceWage ?? '').includes(this.searchTerm) ||
            String(w.date ?? '').includes(this.searchTerm) || 
            String(w.advanceamount ?? '').includes(this.searchTerm)  ||
           String( w.pendingamount ?? '') .includes(this.searchTerm)
          );
        }

        this.rowData = filteredData;
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', filteredData);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading wages:', error);
        this.snackBar.open(this.getApiErrorMessage(error, 'Error loading wages'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const dialogRef = this.dialog.open(WagesFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: { isEdit: false }
    });

    dialogRef.afterClosed().subscribe((result?: WagesDialogResult) => {
      if (!result) return;
      this.wagesService.createWage({
        ...result,
        clientId: this.clientId
      }).subscribe({
        next: () => {
          this.snackBar.open('Wage added successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadWages();
        },
        error: (error) => {
          console.error('Error adding wage:', error);
          this.snackBar.open(error?.error?.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    });
  }

  onEditClick(id?: string): void {
    if (!id) return;
    const wage = this.rowData.find(w => w._id === id);
    if (!wage) {
      this.snackBar.open('Wage not found', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }
    this.zone.run(() => {
      const dialogRef = this.dialog.open(WagesFormDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        disableClose: true,
        autoFocus: false,
        data: { isEdit: true, wage: { ...wage } }
      });

      dialogRef.afterClosed().subscribe((result?: WagesDialogResult) => {
        if (!result) return;
        this.loading = true;
        this.wagesService.updateWage(id, {
          ...result,
          clientId: this.clientId
        }).subscribe({
          next: () => {
            this.snackBar.open('Wage updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadWages();
          },
          error: (error) => {
            console.error('Error updating wage:', error);
            this.snackBar.open(error?.error?.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
            this.loading = false;
          }
        });
      });
    });
  }

  onDeleteClick(id?: string, employeeName?: string): void {
    if (!id) return;
    if (!confirm(`Are you sure you want to delete wage entry${employeeName ? ` for ${employeeName}` : ''}? This action cannot be undone.`)) return;
    this.loading = true;
    this.wagesService.deleteWage(id).subscribe({
      next: () => {
        this.snackBar.open('Wage deleted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadWages();
      },
      error: (error) => {
        console.error('Error deleting wage:', error);
        this.snackBar.open(this.getApiErrorMessage(error, 'Error deleting wage. Please try again.'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  private currencyFormatter(params: ValueFormatterParams): string {
  const value = Number(params.value ?? 0);
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  return `${isNegative ? '-' : ''}₹${absValue.toLocaleString('en-IN')}`;
}


  private dateFormatter(value: unknown): string {
    if (!value) return '';
    const s = String(value);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-IN');
  }
}
