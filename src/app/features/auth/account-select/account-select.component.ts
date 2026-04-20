import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActiveAccountService } from '../../../core/services/active-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountsService } from '../../../core/services/api.services';
import { Account, ApiResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-account-select',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule
  ],
  templateUrl: './account-select.component.html',
  styleUrl: './account-select.component.scss',
})
export class AccountSelectComponent implements OnInit {
  private readonly activeAccount = inject(ActiveAccountService);
  private readonly auth          = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly http          = inject(HttpClient);
  private readonly accountsSvc   = inject(AccountsService);
  private readonly snack         = inject(MessageService);
  private readonly confirmSvc    = inject(ConfirmationService);
  private readonly fb            = inject(FormBuilder);

  readonly user     = this.auth.currentUser;
  readonly isAdmin  = this.auth.isAdmin;
  readonly loading  = signal(false);
  readonly saving   = signal(false);
  readonly accounts = signal<Account[]>([]);

  // Form State
  formVisible = false; // Used for mobile popup
  editingAccount: Account | null = null;

  form = this.fb.group({
    Acc_Code: ['', [Validators.required, Validators.maxLength(20)]],
    Acc_Name: ['', [Validators.required, Validators.maxLength(100)]],
    Remarks:  ['', Validators.maxLength(100)],
  });

  ngOnInit(): void { this.loadAccounts(); }

  loadAccounts(): void {
    this.loading.set(true);
    this.http
      .get<ApiResponse<Account[]>>(`${environment.apiUrl}/accounts`)
      .subscribe({
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
    this.editingAccount = null;
    this.form.reset();
    this.formVisible = true;
  }

  openEditForm(account: Account, event: Event): void {
    event.stopPropagation();
    this.editingAccount = account;
    this.form.patchValue(account);
    this.formVisible = true;
  }

  closeFormPopup(): void {
    this.formVisible = false;
  }

  cancelEdit(): void {
    this.editingAccount = null;
    this.form.reset();
    this.closeFormPopup();
  }

  saveAccount(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    
    this.saving.set(true);
    const v = this.form.getRawValue();

    const obs = this.editingAccount
      ? this.accountsSvc.update(this.editingAccount.AccSno, {
          Acc_Code: v.Acc_Code!,
          Acc_Name: v.Acc_Name!,
          Remarks:  v.Remarks ?? '',
          CurrentRowVer: this.editingAccount.CurrentRowVer,
        })
      : this.accountsSvc.create({
          Acc_Code: v.Acc_Code!,
          Acc_Name: v.Acc_Name!,
          Remarks:  v.Remarks ?? '',
        });

    obs.subscribe({
      next: () => {
        this.snack.add({ severity: 'success', summary: 'Success', detail: this.editingAccount ? 'Account updated.' : 'Account created.' });
        this.saving.set(false);
        this.closeFormPopup();
        this.editingAccount = null;
        this.form.reset();
        this.loadAccounts();
      },
      error: () => { this.saving.set(false); },
    });
  }

  deleteAccount(account: Account, event: Event): void {
    event.stopPropagation();
    
    this.confirmSvc.confirm({
      message: `Delete "${account.Acc_Name}"? This cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.accountsSvc.delete(account.AccSno, account.CurrentRowVer).subscribe({
          next: () => { 
            this.snack.add({ severity: 'success', summary: 'Success', detail: 'Account deleted.' });
            this.loadAccounts(); 
            if (this.editingAccount?.AccSno === account.AccSno) {
              this.editingAccount = null;
              this.form.reset();
            }
          },
        });
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
