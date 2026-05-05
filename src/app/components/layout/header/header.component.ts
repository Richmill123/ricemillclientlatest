import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { PreferenceService } from '../../../services/preference.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatDividerModule, MatTooltipModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  millName = 'Rice Mill Management';
  millLogo = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private prefService: PreferenceService,
  ) {}

  ngOnInit(): void {
    // Load preference and keep header reactive
    if (!this.prefService.snapshot) {
      this.prefService.load().subscribe();
    }
    this.prefService.preference$.subscribe(pref => {
      this.millName = pref?.name || 'Rice Mill Management';
      this.millLogo = pref?.logo || '';
    });
  }

  get username(): string {
    const u = this.auth.getUser();
    return u?.name || u?.username || 'User';
  }

  get userType(): string {
    return this.auth.getUserType();
  }

  get userInitial(): string {
    return (this.username[0] || 'U').toUpperCase();
  }

  goToPreferences(): void {
    this.router.navigate(['/preferences']);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }
}
