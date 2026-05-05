import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MillPreference {
  _id?: string;
  clientId: string;
  name: string;
  logo?: string;          // base64 data-URL or hosted URL
  address?: string;
  phoneNumber?: string;
  bagInKg: number;
  salesBagInKg: number;
  output: string[];       // stock output types e.g. ["bran","husk",...]
  stages: string[];       // processing stages e.g. ["Boiling","Packing"]
  gstPercentage: number;
  // Authorized signatory signature image (base64 data-URL)
  signature?: string;
  // Invoice / billing fields
  gstin?: string;
  email?: string;
  placeOfSupply?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankBranch?: string;
  // Sidebar module visibility — empty means all visible
  visibleModules?: string[];
}

/** Fallback used until the API responds */
export const DEFAULT_PREFERENCE: Omit<MillPreference, '_id' | 'clientId'> = {
  name: 'Rice Mill',
  logo: '',
  address: '',
  phoneNumber: '',
  bagInKg: 50,
  salesBagInKg: 25,
  output: ['bran', 'husk', 'black rice', 'broken rice', 'Karika', 'other'],
  stages: ['Initial Stocking', 'Boiling', 'Splitting', 'Packing'],
  gstPercentage: 0,
};

@Injectable({ providedIn: 'root' })
export class PreferenceService {
  private readonly apiUrl = environment.apiUrl;

  private readonly _pref$ = new BehaviorSubject<MillPreference | null>(null);

  /** Live preference stream — subscribe in any component */
  readonly preference$ = this._pref$.asObservable();

  /** Synchronous snapshot (null until first load) */
  get snapshot(): MillPreference | null {
    return this._pref$.value;
  }

  constructor(private http: HttpClient) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  // ── API calls ──────────────────────────────────────────────────────────────

  /**
   * Load the preference for the current client from the server.
   * Broadcasts result on preference$ and also returns the observable.
   */
  load(): Observable<MillPreference | null> {
    const clientId = this.getClientId();
    if (!clientId) return of(null);

    return this.http
      .get<MillPreference | null>(`${this.apiUrl}/preferences/my?clientId=${encodeURIComponent(clientId)}`)
      .pipe(
        tap(pref => this._pref$.next(pref)),
        catchError(() => of(null))
      );
  }

  /**
   * Upsert (create or update) the preference for the current client.
   * Broadcasts the saved result on preference$.
   */
  save(payload: Omit<MillPreference, '_id'>): Observable<MillPreference> {
    const clientId = this.getClientId();
    return this.http
      .put<MillPreference>(`${this.apiUrl}/preferences/save`, { ...payload, clientId })
      .pipe(tap(pref => this._pref$.next(pref)));
  }

  /**
   * Returns the output types to use as stock item types.
   * Falls back to DEFAULT_PREFERENCE.output if preferences not yet loaded.
   */
  getOutputTypes(): string[] {
    const pref = this._pref$.value;
    const types = pref?.output ?? DEFAULT_PREFERENCE.output;
    return types.length > 0 ? types : DEFAULT_PREFERENCE.output;
  }

  /**
   * Returns true if the given module key is visible.
   * When visibleModules is empty/undefined all modules are shown (default).
   */
  isModuleVisible(key: string): boolean {
    const modules = this._pref$.value?.visibleModules;
    if (!modules || modules.length === 0) return true;
    return modules.includes(key);
  }
}
