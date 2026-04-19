import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { VoucherTypesService } from '../../../core/services/api.services';
import { VoucherType } from '../../../core/models';
import { VoucherTypeFormComponent } from '../voucher-type-form/voucher-type-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-voucher-types-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page-header">
      <h2 class="page-title">Voucher Types</h2>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> New Type
      </button>
    </div>
    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="items()" class="full-table">
        <ng-container matColumnDef="VTyp_Code">
          <th mat-header-cell *matHeaderCellDef>Code</th>
          <td mat-cell *matCellDef="let r">{{ r.VTyp_Code }}</td>
        </ng-container>
        <ng-container matColumnDef="VTyp_Name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let r">{{ r.VTyp_Name }}</td>
        </ng-container>
        <ng-container matColumnDef="Cash_Type">
          <th mat-header-cell *matHeaderCellDef>Cash Type</th>
          <td mat-cell *matCellDef="let r">            
            <span class="chip" [class.chip-in]="r.Cash_Type.trim() === 'IN'" [class.chip-out]="r.Cash_Type.trim() === 'OUT'">
              {{ r.Cash_Type.trim() === 'IN' ? 'Credit (IN)' : 'Debit (OUT)' }}
            </span>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let r">
            <button mat-icon-button matTooltip="Edit" (click)="openForm(r)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button matTooltip="Delete" color="warn" (click)="confirmDelete(r)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      @if (!loading() && items().length === 0) {
        <div class="empty-state"><mat-icon>category</mat-icon><p>No voucher types yet.</p></div>
      }
    </mat-card>
  `,
  styles: [`
    .page-header  { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .page-title   { margin:0; font-size:22px; }
    .full-table   { width:100%; }
    .empty-state  { display:flex; flex-direction:column; align-items:center; padding:48px; color:#aaa; }
    .empty-state mat-icon { font-size:48px; width:48px; height:48px; }
    .chip    { padding:3px 10px; border-radius:12px; font-size:12px; font-weight:500; }
    .chip-in  { background:#e8f5e9; color:#2e7d32; }
    .chip-out { background:#fce4ec; color:#c62828; }
  `],
})
export class VoucherTypesListComponent implements OnInit {
  private svc    = inject(VoucherTypesService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  loading = signal(false);
  items   = signal<VoucherType[]>([]);
  cols    = ['VTyp_Code', 'VTyp_Name', 'Cash_Type', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next:  r  => { this.items.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(row?: VoucherType) {
    this.dialog.open(VoucherTypeFormComponent, { width: '480px', data: row })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  confirmDelete(row: VoucherType) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Voucher Type', message: `Delete "${row.VTyp_Name}"?`, danger: true, confirmText: 'Delete' },
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(row.VouTypeSno, row.CurrentRowVer).subscribe({
        next: () => { this.snack.open('Deleted.', 'OK'); this.load(); },
      });
    });
  }
}
