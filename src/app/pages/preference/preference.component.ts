import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DEFAULT_PREFERENCE, MillPreference, PreferenceService } from '../../services/preference.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

/** All sidebar modules that can be individually toggled. Dashboard is always visible. */
export const ALL_MODULES: { key: string; label: string; icon: string }[] = [
  { key: 'billing',   label: 'Billing',   icon: 'receipt' },
  { key: 'employees', label: 'Employees', icon: 'people' },
  { key: 'expenses',  label: 'Expenses',  icon: 'receipt_long' },
  { key: 'income',    label: 'Income',    icon: 'trending_up' },
  { key: 'orders',    label: 'Orders',    icon: 'shopping_cart' },
  { key: 'purchases', label: 'Purchases', icon: 'shopping_bag' },
  { key: 'reports',   label: 'Reports',   icon: 'bar_chart' },
  { key: 'sales',     label: 'Sales',     icon: 'point_of_sale' },
  { key: 'stock',     label: 'Stock',     icon: 'inventory_2' },
  { key: 'wages',     label: 'Wages',     icon: 'payments' },
];

const ALL_MODULE_KEYS = ALL_MODULES.map(m => m.key);

@Component({
  selector: 'app-preference',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './preference.component.html',
  styleUrls: ['./preference.component.scss'],
})
export class PreferenceComponent implements OnInit {
  // ── State ──────────────────────────────────────────────────────────────────
  form!: FormGroup;
  loading = false;
  saving = false;

  logoPreview: string | null = null;
  logoChanged = false;
  signaturePreview: string | null = null;
  signatureChanged = false;

  // dynamic tag lists
  outputTypes: string[] = [...DEFAULT_PREFERENCE.output];
  stages: string[]      = [...DEFAULT_PREFERENCE.stages];

  newOutputTag = '';
  newStageTag  = '';

  // module visibility — set of visible module keys
  visibleModules: Set<string> = new Set(ALL_MODULE_KEYS);
  readonly allModules = ALL_MODULES;

  // account settings (local only)
  currency    = 'INR';
  dateFormat  = 'dd/MM/yyyy';
  enableNotifications = true;

  username = '';

  readonly currencies  = ['INR', 'USD', 'EUR'];
  readonly dateFormats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];

  // ── Constructor ────────────────────────────────────────────────────────────
  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private prefService: PreferenceService,
  ) {}

  ngOnInit(): void {
    const u = this.auth.getUser();
    this.username = u?.name || u?.username || '';

    this.currency            = localStorage.getItem('pref_currency')     || 'INR';
    this.dateFormat          = localStorage.getItem('pref_date_format')  || 'dd/MM/yyyy';
    this.enableNotifications = localStorage.getItem('pref_notifications') !== 'false';

    this.buildForm();
    this.loadFromServer();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      name:          ['', [Validators.required, Validators.minLength(2)]],
      address:       [''],
      phoneNumber:   [''],
      gstPercentage: [0, [Validators.min(0), Validators.max(100)]],
      bagInKg:       [50, [Validators.required, Validators.min(1)]],
      salesBagInKg:  [25, [Validators.required, Validators.min(1)]],
      gstin:         [''],
      email:         [''],
      placeOfSupply: [''],
      bankName:      [''],
      bankAccount:   [''],
      bankIfsc:      [''],
      bankBranch:    [''],
    });
  }

  private loadFromServer(): void {
    this.loading = true;
    this.prefService.load().subscribe({
      next: (pref) => {
        this.loading = false;
        if (pref) this.patchForm(pref);
      },
      error: () => { this.loading = false; },
    });
  }

  private patchForm(pref: MillPreference): void {
    this.form.patchValue({
      name:          pref.name          ?? '',
      address:       pref.address       ?? '',
      phoneNumber:   pref.phoneNumber   ?? '',
      gstPercentage: pref.gstPercentage ?? 0,
      bagInKg:       pref.bagInKg       ?? 50,
      salesBagInKg:  pref.salesBagInKg  ?? 25,
      gstin:         pref.gstin         ?? '',
      email:         pref.email         ?? '',
      placeOfSupply: pref.placeOfSupply ?? '',
      bankName:      pref.bankName      ?? '',
      bankAccount:   pref.bankAccount   ?? '',
      bankIfsc:      pref.bankIfsc      ?? '',
      bankBranch:    pref.bankBranch    ?? '',
    });
    this.outputTypes      = pref.output?.length ? [...pref.output] : [...DEFAULT_PREFERENCE.output];
    this.stages           = pref.stages?.length ? [...pref.stages] : [...DEFAULT_PREFERENCE.stages];
    this.logoPreview      = pref.logo      || null;
    this.signaturePreview = pref.signature || null;

    // Module visibility: if saved list is non-empty use it, else default to all
    const saved = pref.visibleModules ?? [];
    this.visibleModules = new Set(saved.length ? saved : ALL_MODULE_KEYS);
  }

  // ── Module visibility ──────────────────────────────────────────────────────

  isModuleOn(key: string): boolean {
    return this.visibleModules.has(key);
  }

  toggleModule(key: string): void {
    if (this.visibleModules.has(key)) {
      this.visibleModules.delete(key);
    } else {
      this.visibleModules.add(key);
    }
    // Trigger Angular change detection (Set mutation doesn't auto-detect)
    this.visibleModules = new Set(this.visibleModules);
  }

  // ── Logo upload ────────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.compressImage(dataUrl, 400, 400, 0.75).then(compressed => {
        this.logoPreview = compressed;
        this.logoChanged = true;
      });
    };
    reader.readAsDataURL(file);
  }

  private compressImage(dataUrl: string, maxW: number, maxH: number, quality: number): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  removeLogo(): void {
    this.logoPreview = null;
    this.logoChanged = true;
  }

  // ── Signature upload ───────────────────────────────────────────────────────

  onSignatureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.compressImage(dataUrl, 600, 200, 0.85).then(compressed => {
        this.signaturePreview = compressed;
        this.signatureChanged = true;
      });
    };
    reader.readAsDataURL(file);
  }

  removeSignature(): void {
    this.signaturePreview = null;
    this.signatureChanged = true;
  }

  // ── Output / Stage tag management ──────────────────────────────────────────

  addOutputTag(): void {
    const tag = this.newOutputTag.trim();
    if (tag && !this.outputTypes.includes(tag)) {
      this.outputTypes = [...this.outputTypes, tag];
    }
    this.newOutputTag = '';
  }

  removeOutputTag(tag: string): void {
    this.outputTypes = this.outputTypes.filter(t => t !== tag);
  }

  addStageTag(): void {
    const tag = this.newStageTag.trim();
    if (tag && !this.stages.includes(tag)) {
      this.stages = [...this.stages, tag];
    }
    this.newStageTag = '';
  }

  removeStageTag(tag: string): void {
    this.stages = this.stages.filter(t => t !== tag);
  }

  onTagKeydown(event: KeyboardEvent, type: 'output' | 'stage'): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      type === 'output' ? this.addOutputTag() : this.addStageTag();
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  savePreferences(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    localStorage.setItem('pref_currency',      this.currency);
    localStorage.setItem('pref_date_format',   this.dateFormat);
    localStorage.setItem('pref_notifications', String(this.enableNotifications));

    const raw      = this.form.getRawValue();
    const clientId = this.auth.getClientId();

    const payload: Omit<MillPreference, '_id'> = {
      clientId,
      name:          raw.name.trim(),
      address:       raw.address?.trim()       ?? '',
      phoneNumber:   raw.phoneNumber?.trim()   ?? '',
      gstPercentage: Number(raw.gstPercentage) ?? 0,
      bagInKg:       Number(raw.bagInKg),
      salesBagInKg:  Number(raw.salesBagInKg),
      output:    this.outputTypes,
      stages:    this.stages,
      logo:      this.logoPreview      ?? '',
      signature: this.signaturePreview ?? '',
      gstin:         raw.gstin?.trim()         ?? '',
      email:         raw.email?.trim()         ?? '',
      placeOfSupply: raw.placeOfSupply?.trim() ?? '',
      bankName:      raw.bankName?.trim()      ?? '',
      bankAccount:   raw.bankAccount?.trim()   ?? '',
      bankIfsc:      raw.bankIfsc?.trim()      ?? '',
      bankBranch:    raw.bankBranch?.trim()    ?? '',
      visibleModules: Array.from(this.visibleModules),
    };

    this.saving = true;
    this.prefService.save(payload).subscribe({
      next: () => {
        this.saving = false;
        this.logoChanged      = false;
        this.signatureChanged = false;
        this.snackBar.open('Preferences saved successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || 'Error saving preferences';
        this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
      },
    });
  }

  // ── Misc ───────────────────────────────────────────────────────────────────

  logout(): void { this.auth.logout(); }
}
