// add-child-modal.component.ts
import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Child } from 'src/app/interfaces/child.interface';
import { ChildrenService } from 'src/app/services/children/children.service';

import {Subscription} from "rxjs";

@Component({
  selector: 'app-add-child-modal',
  standalone: true,
  templateUrl: './add-child-modal.component.html',
  styleUrls: ['./add-child-modal.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class AddChildModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  private childrenService = inject(ChildrenService);
  private docTypeSub?: Subscription;

  maxDob = this.dateToYmd(this.subYears(new Date(), 1));

  get docType() { return this.childForm.get('documentType')!; }
  get docNumber() { return this.childForm.get('documentNumber')!; }

  @Input() mode: 'create' | 'edit' = 'create';
  @Input() child: Child | null = null;

  documentTypes = [
    { value: 'DNI',      label: 'DNI' },
    { value: 'CUIL',     label: 'CUIL' },
    { value: 'PASSPORT', label: 'Pasaporte' },
  ];

  childForm: FormGroup;

  isDocNumeric = true;
  documentMaxLen = 10; // DNI con puntos (12.345.678 = 10)
  documentNumberError = 'Número inválido';

  schoolName: string | null = null;
  isValidatingSchool = false;
  schoolError: string | null = null;

  constructor() {
    this.childForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      inviteCode: [''], 
      documentType: ['DNI', Validators.required],
      documentNumber: ['', Validators.required],
      dateOfBirth: ['', Validators.required], // YYYY-MM-DD
      grade: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      division: ['', Validators.required],
    });
  }

  ngOnInit() {
    if (this.mode === 'edit' && this.child) {
      this.childForm.patchValue({
        firstName: this.child.firstName,
        lastName: this.child.lastName,
        documentType: this.child.documentType ?? 'DNI',
        documentNumber: this.child.documentNumber ?? '',
        dateOfBirth: this.child.dateOfBirth ? this.child.dateOfBirth.slice(0, 10) : '',
        grade: this.child.grade ?? '',
        division: this.child.division ?? '',
      });
    }

    // Aplicar validación inicial y reaccionar a cambios
    this.applyDocRules(this.docType.value);
    this.docTypeSub = this.docType.valueChanges.subscribe((t) => this.applyDocRules(t));

    if (this.mode === 'create') {
      this.childForm.get('inviteCode')?.setValidators([Validators.required]);
      this.childForm.get('inviteCode')?.updateValueAndValidity();
    }
  }

  onInviteCodeBlur() {
    const code = this.childForm.get('inviteCode')?.value?.trim();
    if (!code) {
      this.schoolName = null;
      this.schoolError = null;
      return;
    }

    this.isValidatingSchool = true;
    this.schoolError = null;
    this.schoolName = null;

    this.childrenService.lookupSchoolByCode(code).subscribe({
      next: (school) => {
        this.schoolName = school.name;
        this.isValidatingSchool = false;
      },
      error: () => {
        this.schoolError = 'Código de colegio inválido';
        this.isValidatingSchool = false;
        this.childForm.get('inviteCode')?.setErrors({ invalidCode: true });
      }
    });
  }

  private applyDocRules(type: 'DNI' | 'CUIL' | 'PASSPORT') {
    this.isDocNumeric = type !== 'PASSPORT';

    if (type === 'DNI') {
      this.documentMaxLen = 10; // 12.345.678
      this.docNumber.setValidators([Validators.required, this.dniValidator()]);
      this.documentNumberError = 'DNI: 7 u 8 dígitos';
    } else if (type === 'CUIL') {
      this.documentMaxLen = 13; // 20-12345678-3
      this.docNumber.setValidators([Validators.required, this.cuilValidator()]);
      this.documentNumberError = 'CUIL: 11 dígitos (validación de dígito verificador)';
    } else {
      this.documentMaxLen = 12;
      this.docNumber.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9]{6,12}$/)]);
      this.documentNumberError = 'Pasaporte: 6 a 12 letras/números';
    }

    this.docNumber.updateValueAndValidity({ emitEvent: false });
    // Re-formatear lo que ya haya escrito
    this.onDocumentBlur();
  }

  onDocumentInput(event: any) {
    const raw = String(event?.detail?.value ?? '');

    const type = this.docType.value;

    if (type === 'PASSPORT') {
      // Pasaporte: alfanumérico, upper, sin espacios
      const cleaned = raw.replace(/\s+/g, '').toUpperCase().slice(0, this.documentMaxLen);
      this.docNumber.setValue(cleaned, { emitEvent: false });
      return;
    }

    // DNI / CUIL: solo dígitos + formato
    const digits = raw.replace(/\D/g, '').slice(0, type === 'DNI' ? 8 : 11);
    const formatted = type === 'DNI' ? this.formatDni(digits) : this.formatCuil(digits);

    this.docNumber.setValue(formatted, { emitEvent: false });
  }

  onDocumentBlur() {
    // asegura formato “final” al salir del input
    this.onDocumentInput({ detail: { value: this.docNumber.value } });
  }

  private formatDni(d: string) {
    // 12345678 -> 12.345.678
    return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private formatCuil(d: string) {
    // 20123456783 -> 20-12345678-3 (parcial también)
    if (d.length <= 2) return d;
    if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10, 11)}`;
  }

  private dniValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const digits = String(control.value ?? '').replace(/\D/g, '');
      return /^\d{7,8}$/.test(digits) ? null : { dni: true };
    };
  }

  private cuilValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const digits = String(control.value ?? '').replace(/\D/g, '');
      if (!/^\d{11}$/.test(digits)) return { cuil: true };

      // Dígito verificador CUIT/CUIL
      const weights = [5,4,3,2,7,6,5,4,3,2];
      const nums = digits.split('').map(n => Number(n));
      const sum = weights.reduce((acc, w, i) => acc + w * nums[i], 0);
      const mod = sum % 11;
      let check = 11 - mod;
      if (check === 11) check = 0;
      if (check === 10) check = 9;

      return nums[10] === check ? null : { cuilCheck: true };
    };
  }

  onDivisionInput(event: any) {
    const raw = String(event?.detail?.value ?? '');
    const letter = raw.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
    this.childForm.patchValue({ division: letter }, { emitEvent: false });
  }

  private subYears(d: Date, years: number) {
    const x = new Date(d);
    x.setFullYear(x.getFullYear() - years);
    return x;
  }

  private dateToYmd(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private maxDateValidator(maxYmd: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = String(control.value ?? '');
      if (!v) return null; // required lo maneja Validators.required
      // Como es YYYY-MM-DD, comparar strings funciona.
      return v <= maxYmd ? null : { maxDate: true };
    };
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  save() {
    if (this.childForm.invalid || (this.mode === 'create' && !this.schoolName)) {
      this.childForm.markAllAsTouched();
      // Si el código está presente pero no validado, forzamos blur
      if (this.mode === 'create' && !this.schoolName && this.childForm.get('inviteCode')?.value) {
        this.onInviteCodeBlur();
      }
      return;
    }

    const raw = this.childForm.value;
    const type = raw.documentType;

    const normalizedDoc =
      type === 'PASSPORT'
        ? String(raw.documentNumber ?? '').replace(/\s+/g, '').toUpperCase()
        : String(raw.documentNumber ?? '').replace(/\D/g, ''); // DNI/CUIL: solo dígitos

    // Fecha: evitá el “me cambió un día” por timezone.
    // Mandá YYYY-MM-DD o armá Date local a mediodía.
    const dob = raw.dateOfBirth ? String(raw.dateOfBirth) : null;

    const payload = {
      ...raw,
      documentNumber: normalizedDoc || null,
      grade: raw.grade != null ? String(raw.grade).replace(/\D/g, '') : null,
      division: raw.division != null ? String(raw.division).toUpperCase() : null,
      dateOfBirth: dob, // <-- recomendación: mandar 'YYYY-MM-DD' al backend
    };

    const result = this.mode === 'edit'
      ? { ...payload, id: this.child?.id }
      : payload;

    this.modalCtrl.dismiss(result, 'confirm');
  }
}
