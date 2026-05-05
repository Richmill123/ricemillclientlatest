import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ErrorDialogComponent } from '../../../shared/components/error-dialog/error-dialog.component';

export type UserType = 'merchant' | 'hybrid' | 'custom';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDialogModule,
    ErrorDialogComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  userType: UserType = 'merchant';
  hidePassword = true;
  isLoading = false;

  readonly userTypes: { value: UserType; label: string; icon: string }[] = [
    { value: 'merchant', label: 'Merchant', icon: 'storefront' },
    { value: 'hybrid',   label: 'Hybrid',   icon: 'swap_horiz'  },
    { value: 'custom',   label: 'Custom',   icon: 'tune'        }
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.auth.saveSession(response, this.userType);
        this.toastr.success('Login successful!', 'Success', {
          timeOut: 3000,
          positionClass: 'toast-top-right',
          closeButton: true
        });
        this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        let msg = 'An error occurred during login.';
        if (error.status === 401) {
          msg = 'Invalid username or password.';
        } else if (error.status === 0) {
          msg = 'Cannot reach the server. Check your connection.';
        } else {
          msg = error.error?.message || error.message || msg;
        }
        this.dialog.open(ErrorDialogComponent, { width: '350px', data: { message: msg } });
      }
    });
  }
}
