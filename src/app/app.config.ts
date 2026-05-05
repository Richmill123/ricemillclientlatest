import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { provideToastr } from 'ngx-toastr';
import { MatButtonModule }       from '@angular/material/button';
import { MatIconModule }         from '@angular/material/icon';
import { MatSidenavModule }      from '@angular/material/sidenav';
import { MatToolbarModule }      from '@angular/material/toolbar';
import { MatMenuModule }         from '@angular/material/menu';
import { MatListModule }         from '@angular/material/list';
import { MatDividerModule }      from '@angular/material/divider';
import { MatCardModule }         from '@angular/material/card';
import { MatTableModule }        from '@angular/material/table';
import { MatPaginatorModule }    from '@angular/material/paginator';
import { MatSortModule }         from '@angular/material/sort';
import { MatFormFieldModule }    from '@angular/material/form-field';
import { MatInputModule }        from '@angular/material/input';
import { MatSelectModule }       from '@angular/material/select';
import { MatDatepickerModule }   from '@angular/material/datepicker';
import { MatNativeDateModule }   from '@angular/material/core';
import { MatDialogModule }       from '@angular/material/dialog';
import { MatSnackBarModule }     from '@angular/material/snack-bar';
import { MatSlideToggleModule }  from '@angular/material/slide-toggle';
import { MatTooltipModule }      from '@angular/material/tooltip';
import { MatChipsModule }        from '@angular/material/chips';

import { routes }          from './app.routes';
import { jwtInterceptor }  from './interceptors/jwt.interceptor';

const materialModules = [
  MatButtonModule, MatIconModule, MatSidenavModule, MatToolbarModule,
  MatMenuModule, MatListModule, MatDividerModule, MatCardModule,
  MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
  MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
  MatDialogModule, MatSnackBarModule, MatSlideToggleModule, MatTooltipModule,
  MatChipsModule
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideToastr({
      timeOut: 5000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      closeButton: true,
      progressBar: true,
      progressAnimation: 'decreasing',
      tapToDismiss: true,
      maxOpened: 3,
      autoDismiss: true,
      newestOnTop: true,
      iconClasses: {
        error: 'toast-error', info: 'toast-info',
        success: 'toast-success', warning: 'toast-warning'
      },
      enableHtml: true
    }),
    importProvidersFrom([...materialModules]),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        horizontalPosition: 'right',
        verticalPosition: 'top',
        duration: 3000,
      }
    }
  ]
};
