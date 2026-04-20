import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActiveAccountService } from '../../core/services/active-account.service';
import { AuthService } from '../../core/services/auth.service';

interface QuickLink { label: string; icon: string; route: string; colorClass: string; description: string; }

@Component({
  selector: 'app-dashboard', 
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly account = inject(ActiveAccountService);
  readonly user    = inject(AuthService).currentUser;

  readonly quickLinks: QuickLink[] = [
    { label: 'Ledger Groups',    icon: 'folder_open',          route: '/app/ledger-groups',   colorClass: 'color-blue',   description: 'Manage hierarchical ledger groupings.' },
    { label: 'Ledgers',          icon: 'account_tree',         route: '/app/ledgers',         colorClass: 'color-green',  description: 'Create and organize individual ledgers.' },
    { label: 'Voucher Types',    icon: 'category',             route: '/app/voucher-types',   colorClass: 'color-orange', description: 'Configure types for accurate tracking.' },
    { label: 'Voucher Series',   icon: 'format_list_numbered', route: '/app/voucher-series',  colorClass: 'color-purple', description: 'Define auto-running sequence structures.' },
    { label: 'Vouchers',         icon: 'receipt_long',         route: '/app/vouchers',        colorClass: 'color-red',    description: 'Log and review daily financial transactions.' },
    { label: 'Ledger Statement', icon: 'bar_chart',            route: '/app/ledger-statement',colorClass: 'color-teal',   description: 'Visually analyze ledger balances and reports.' },
  ];
}
