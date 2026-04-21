import { Component, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { LedgerGroupsService } from '../../../core/services/api.services';
import { LedgerGroup } from '../../../core/models';

@Component({
  selector: 'app-ledger-group-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ledger-group-form.component.html',
  styleUrl: './ledger-group-form.component.scss',
})
export class LedgerGroupFormComponent implements OnInit {

  /** Pass a LedgerGroup to edit; undefined → create mode. */
  readonly row = input<LedgerGroup | undefined>(undefined);

  readonly saved     = output<void>();
  readonly cancelled = output<void>();

  private readonly svc = inject(LedgerGroupsService);
  private readonly fb  = inject(FormBuilder);

  saving = false;

  form = this.fb.nonNullable.group({
    Grp_Code: ['', [Validators.required, Validators.maxLength(20)]],
    Grp_Name: ['', [Validators.required, Validators.maxLength(100)]],
    Remarks:  ['', Validators.maxLength(250)],
  });

  ngOnInit(): void {
    const r = this.row();
    if (r) {
      // Patch all three fields so edits always start with existing values
      this.form.patchValue({
        Grp_Code: r.Grp_Code,
        Grp_Name: r.Grp_Name,
        Remarks:  r.Remarks ?? '',
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v   = this.form.getRawValue();
    const r   = this.row();
    const obs = r
      ? this.svc.update(r.GrpSno, { ...v, CurrentRowVer: r.CurrentRowVer })
      : this.svc.create(v);

    obs.subscribe({
      next:  () => { this.saving = false; this.saved.emit(); },
      error: () => { this.saving = false; },
    });
  }

  cancel(): void { this.cancelled.emit(); }

  get f() { return this.form.controls; }

  get remarksLen(): number { return this.f['Remarks'].value.length; }
}
