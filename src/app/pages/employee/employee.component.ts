import { Component, NgZone, OnInit } from '@angular/core';
import { ColDef, GridReadyEvent, GridApi, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmployeeFormDialogComponent } from './employee-form-dialog/employee-form-dialog.component';
import { EmployeeService, Employee } from '../../services/employee.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [
    AgGridModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.scss']
})
export class EmployeeComponent implements OnInit {
  private gridApi!: GridApi;

  rowData: any[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Name', sortable: true, filter: true, flex: 1, minWidth: 140 },
    { field: 'phoneNumber', headerName: 'Phone', sortable: true, filter: true, width: 150 },
    { field: 'gender', headerName: 'Gender', sortable: true, filter: true, width: 110 },
    {
      field: 'salary', headerName: 'Salary', sortable: true, filter: true, width: 130,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'debtAmount', headerName: 'Debt', sortable: true, filter: true, width: 130,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      field: 'advanceAmount', headerName: 'Advance Debt', sortable: true, filter: true, width: 140,
      valueFormatter: (p: ValueFormatterParams) => this.currencyFormatter(p)
    },
    {
      headerName: 'Actions', field: 'actions', sortable: false, filter: false, width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const div = document.createElement('div');
        div.className = 'gridActionBtnWrap';

        const editBtn = document.createElement('button');
        editBtn.className = 'mat-icon-button gridAction-edit';
        editBtn.innerHTML = 'edit';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onEditClick(params.data._id); });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mat-icon-button gridAction-delete';
        deleteBtn.innerHTML = 'delete';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onDeleteClick(params.data._id); });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      }
    }
  ];

  defaultColDef: ColDef = { flex: 1, minWidth: 100, resizable: true };

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar
  ) {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(term => {
      this.searchTerm = term;
      this.loadEmployees();
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  private currencyFormatter(params: ValueFormatterParams): string {
    const v = Number(params.value ?? 0);
    return `₹${v.toLocaleString('en-IN')}`;
  }

  onGridReady(params: GridReadyEvent): void { this.gridApi = params.api; }

  onSearchChange(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        let filtered = (data || []).map((e: any) => ({
          ...e,
          salary: Number(e.salary) || 0,
          debtAmount: Number(e.debtAmount) || 0,
          advanceAmount: Number(e.advanceAmount) || 0
        }));

        if (this.searchTerm) {
          const s = this.searchTerm.toLowerCase();
          filtered = filtered.filter((e: Employee) =>
            (e.name || '').toLowerCase().includes(s) ||
            (e.phoneNumber || '').includes(this.searchTerm)
          );
        }

        this.rowData = filtered;
        if (this.gridApi) this.gridApi.setGridOption('rowData', filtered);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.snackBar.open('Error loading employees', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const dialogRef = this.dialog.open(EmployeeFormDialogComponent, {
      autoFocus: false, restoreFocus: false,
      width: '700px', height: '80vh',
      data: { isEdit: false }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.employeeService.createEmployee({ ...result, clientId: this.getClientId() }).subscribe({
        next: () => {
          this.snackBar.open('Employee added successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadEmployees();
        },
        error: (error) => {
          this.snackBar.open(error?.error?.message || 'Error adding employee', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    });
  }

  onEditClick(id: string): void {
    const employee = this.rowData.find(e => e._id === id);
    if (!employee) return;
    this.zone.run(() => {
      const dialogRef = this.dialog.open(EmployeeFormDialogComponent, {
        width: '700px', height: '80vh',
        data: { isEdit: true, employee: { ...employee } }
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (!result) return;
        this.loading = true;
        this.employeeService.updateEmployee(employee._id, result).subscribe({
          next: () => {
            this.snackBar.open('Employee updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadEmployees();
          },
          error: (error) => {
            this.snackBar.open(error?.error?.message || 'Error updating employee', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
            this.loading = false;
          }
        });
      });
    });
  }

  onDeleteClick(id: string): void {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    this.loading = true;
    this.employeeService.deleteEmployee(id).subscribe({
      next: () => {
        this.snackBar.open('Employee deleted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadEmployees();
      },
      error: (error) => {
        this.snackBar.open(error?.error?.message || 'Error deleting employee', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }
}
