import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../../services/auth.service';
import { PreferenceService } from '../../../services/preference.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatListModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private router      = inject(Router);
  private auth        = inject(AuthService);
  private prefService = inject(PreferenceService);

  /** Emitted after every navigation — lets the parent close the drawer on mobile */
  @Output() navigate = new EventEmitter<void>();

  ngOnInit(): void {
    if (!this.prefService.snapshot) {
      this.prefService.load().subscribe();
    }
  }

  /** Returns true when the module should be shown in the sidebar. */
  isModuleVisible(key: string): boolean {
    return this.prefService.isModuleVisible(key);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]).catch(err => console.error('Navigation error:', err));
    this.navigate.emit();
  }

  isActive(route: string): boolean {
    return this.router.url === `/${route}`;
  }

  logout(): void {
    this.auth.logout();
  }
}
