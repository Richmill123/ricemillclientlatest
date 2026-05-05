import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { HeaderComponent } from './components/layout/header/header.component';
import { SidebarComponent } from './components/layout/sidebar/sidebar.component';

const SCROLLABLE_ROUTES = ['/dashboard', '/preferences'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatIconModule, CommonModule, RouterOutlet, MatSidenavModule,
    MatToolbarModule, MatButtonModule, MatListModule, MatMenuModule,
    HeaderComponent, SidebarComponent, RouterModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Rice Mill Management System';
  isSidebarOpen = true;
  isMobileView = false;
  isLoginPage = false;
  isScrollablePage = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url: string = event.url.split('?')[0];
      this.isLoginPage = url === '/login' || url === '/';
      this.isScrollablePage = SCROLLABLE_ROUTES.some(r => url.startsWith(r));
      if (!this.isLoginPage) {
        this.isSidebarOpen = !this.isMobileView;
      }
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  checkScreenSize(): void {
    this.isMobileView = window.innerWidth <= 1024;
    if (this.isMobileView) this.isSidebarOpen = false;
    else this.isSidebarOpen = true;
  }

  onSidebarNavigate(): void {
    if (this.isMobileView) this.isSidebarOpen = false;
  }
}
