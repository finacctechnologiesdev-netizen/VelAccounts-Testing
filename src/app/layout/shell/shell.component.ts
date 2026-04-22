import { Component, inject, signal, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter, Subscription } from 'rxjs';

// PrimeNG
import { Drawer, DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Menu, MenuModule } from 'primeng/menu';
import { DividerModule } from 'primeng/divider';
import { RippleModule } from 'primeng/ripple';
import { MenuItem } from 'primeng/api';

import { AuthService } from '../../core/services/auth.service';
import { ActiveAccountService } from '../../core/services/active-account.service';

interface NavItem { label: string; icon: string; route: string; adminOnly?: boolean; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    DrawerModule, ButtonModule, TooltipModule,
    MenuModule, DividerModule, RippleModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  /** Reference to PrimeNG Drawer so we can call close() from headless template. */
  @ViewChild('drawerRef') drawerRef!: Drawer;
  @ViewChild('userMenu')  userMenu!: Menu;

  private readonly auth          = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly breakpointObs = inject(BreakpointObserver);

  readonly activeAccount = inject(ActiveAccountService);
  readonly user          = this.auth.currentUser;
  readonly isAdmin       = this.auth.isAdmin;

  /** Plain boolean — directly bindable to p-drawer [(visible)]. */
  sidenavOpen = true;
  /** True when viewport is handset/tablet-portrait. */
  isMobile    = signal(false);
  activeRoute = signal('');

  private subs = new Subscription();

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',        icon: 'pi pi-home',      route: '/app/dashboard' },
    { label: 'Ledger Groups',    icon: 'pi pi-folder',    route: '/app/ledger-groups' },
    { label: 'Ledgers',          icon: 'pi pi-sitemap',   route: '/app/ledgers' },
    { label: 'Voucher Types',    icon: 'pi pi-tag',       route: '/app/voucher-types',   adminOnly: true },
    { label: 'Voucher Series',   icon: 'pi pi-list',      route: '/app/voucher-series',  adminOnly: true },
    { label: 'Vouchers',         icon: 'pi pi-receipt',   route: '/app/vouchers' },
    { label: 'Ledger Statement', icon: 'pi pi-chart-bar', route: '/app/ledger-statement' },
  ];

  readonly adminItems: NavItem[] = [
    { label: 'Books of Accounts', icon: 'pi pi-book', route: '/app/accounts' },
  ];

  userMenuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.userMenuItems = [
      {
        label: 'Switch Account',
        icon: 'pi pi-arrow-right-arrow-left',
        command: () => this.switchAccount(),
      },
      { separator: true },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        styleClass: 'danger-item',
        command: () => this.logout(),
      },
    ];

    // Adapt sidebar behaviour to viewport
    this.subs.add(
      this.breakpointObs
        .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
        .subscribe(result => {
          const mobile = result.matches;
          this.isMobile.set(mobile);
          // Start open on desktop, closed on mobile
          this.sidenavOpen = !mobile;
        })
    );

    // Set active route; auto-close on mobile after navigation
    this.activeRoute.set(this.router.url);
    this.subs.add(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe((e: NavigationEnd) => {
          this.activeRoute.set(e.urlAfterRedirects ?? e.url);
          if (this.isMobile()) this.sidenavOpen = false;
        })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidenavOpen = !this.sidenavOpen;
  }

  /** Called from the X button inside the headless template. */
  closeDrawer(event: Event): void {
    this.drawerRef.close(event);
  }

  toggleUserMenu(event: Event): void {
    this.userMenu.toggle(event);
  }

  isActive(route: string): boolean {
    return this.activeRoute().startsWith(route);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
    if (this.isMobile()) this.sidenavOpen = false;
  }

  switchAccount(): void {
    this.activeAccount.clearAccount();
    this.router.navigate(['/select-account']);
  }

  logout(): void {
    this.auth.logout();
  }
}