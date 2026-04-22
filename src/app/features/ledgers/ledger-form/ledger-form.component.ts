import { Component, inject, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { LedgersService, LedgerGroupsService } from '../../../core/services/api.services';
import { Ledger, LedgerGroup } from '../../../core/models';

@Component({
  selector: 'app-ledger-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ledger-form.component.html',
})
export class LedgerFormComponent implements OnInit {

  /** Pass a Ledger to edit; undefined → create mode. */
  readonly row = input<Ledger | undefined>(undefined);

  readonly saved     = output<void>();
  readonly cancelled = output<void>();

  private readonly svc      = inject(LedgersService);
  private readonly grpSvc   = inject(LedgerGroupsService);
  private readonly fb       = inject(FormBuilder);

  saving = false;
  groups = signal<LedgerGroup[]>([]);

  form = this.fb.nonNullable.group({
    Led_Code: ['', [Validators.required, Validators.maxLength(20)]],
    Led_Name: ['', [Validators.required, Validators.maxLength(100)]],
    GrpSno:   [0,  Validators.required],
    Remarks:  ['', [Validators.maxLength(250)]],
  });

  ngOnInit(): void {
    this.grpSvc.list().subscribe(r => this.groups.set(r.data ?? []));
    
    const r = this.row();
    if (r) {
      this.form.patchValue({
        Led_Code: r.Led_Code,
        Led_Name: r.Led_Name,
        GrpSno:   r.GrpSno,
        Remarks:  r.Remarks ?? '',
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    
    // Additional validation to ensure group is selected
    if (this.form.controls.GrpSno.value === 0) {
      this.form.controls.GrpSno.setErrors({ 'required': true });
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const v   = this.form.getRawValue();
    const r   = this.row();
    const obs = r
      ? this.svc.update(r.LedSno, { ...v, CurrentRowVer: r.CurrentRowVer })
      : this.svc.create(v);

    obs.subscribe({
      next:  () => { this.saving = false; this.saved.emit(); },
      error: () => { this.saving = false; },
    });
  }

  cancel(): void { this.cancelled.emit(); }

  get f() { return this.form.controls; }
}
