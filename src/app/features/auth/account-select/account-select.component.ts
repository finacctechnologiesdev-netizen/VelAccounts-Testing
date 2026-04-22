import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ActiveAccountService } from '../../../core/services/active-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountsService } from '../../../core/services/api.services';
import { Account } from '../../../core/models';
import { AccountFormComponent } from '../../accounts/account-form/account-form.component';

import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MenuModule } from 'primeng/menu';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';

@Component({
  selector: 'app-account-select',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule, ConfirmDialogModule, ToastModule, MenuModule,
    AccountFormComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './account-select.component.html',
  styleUrl: './account-select.component.scss',
})
export class AccountSelectComponent implements OnInit {
  private readonly activeAccount = inject(ActiveAccountService);
  private readonly auth          = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly accountsSvc   = inject(AccountsService);
  private readonly snack         = inject(MessageService);
  private readonly confirmSvc    = inject(ConfirmationService);

  readonly user     = this.auth.currentUser;
  readonly isAdmin  = this.auth.isAdmin;
  readonly loading  = signal(false);
  readonly accounts = signal<Account[]>([]);

  formVisible = false;
  editingAccount: Account | undefined = undefined;

  userMenuItems: MenuItem[] = [
    { label: 'Profile', icon: 'pi pi-user', disabled: true },
    { separator: true },
    { label: 'Logout', icon: 'pi pi-sign-out', styleClass: 'danger-item', command: () => this.logout() }
  ];

  ngOnInit(): void { this.loadAccounts(); }

  loadAccounts(): void {
    this.loading.set(true);
    this.accountsSvc.list().subscribe({
      next:  res => { this.accounts.set(res.data ?? []); this.loading.set(false); },
      error: ()  => { 
        this.loading.set(false);
        this.snack.add({ severity: 'error', summary: 'Error', detail: 'Failed to load accounts' });
      },
    });
  }

  select(account: Account): void {
    this.activeAccount.setAccount(account);
    this.router.navigate(['/app/dashboard']);
  }

  openCreateForm(): void {
    this.editingAccount = undefined;
    this.formVisible = true;
  }

  openEditForm(account: Account, event: Event): void {
    event.stopPropagation();
    this.editingAccount = account;
    this.formVisible = true;
  }

  closeFormPopup(): void {
    this.formVisible = false;
    this.editingAccount = undefined;
  }

  onFormSaved(): void {
    this.closeFormPopup();
    this.loadAccounts();
    this.snack.add({ severity: 'success', summary: 'Success', detail: 'Book of accounts saved successfully.' });
  }

  deleteAccount(account: Account, event: Event): void {
    event.stopPropagation();
    
    this.confirmSvc.confirm({
      message: `Delete "${account.Acc_Name}"? This cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Delete', severity: 'danger', icon: 'pi pi-trash' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.accountsSvc.delete(account.AccSno, account.CurrentRowVer).subscribe({
          next: () => { 
            this.snack.add({ severity: 'warn', summary: 'Deleted', detail: 'Account deleted successfully.', icon: 'pi pi-trash' });
            this.loadAccounts(); 
          },
          error: () => this.snack.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete account.' })
        });
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
