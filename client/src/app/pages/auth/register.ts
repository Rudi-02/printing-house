import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Role } from '../../core/models';

const PASSWORD_REGEX = /^(?=[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>\/?\\|`~]).{8,12}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^[+]?[0-9\s\-/()]{6,20}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="card" style="max-width:820px;margin:0 auto">
    <h1>Registracija novog korisnika</h1>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (info()) { <div class="alert alert-ok">{{ info() }}</div> }

    <form (ngSubmit)="submit()" #f="ngForm">
      <div class="field">
        <label for="role">Tip korisnika</label>
        <select id="role" name="role" [(ngModel)]="role">
          <option value="INDIVIDUAL">Klijent — fizičko lice</option>
          <option value="LEGAL">Klijent — pravno lice</option>
          <option value="PRINTER">Štamparija</option>
        </select>
        @if (role !== 'INDIVIDUAL') {
          <div class="hint">Ovaj tip naloga zahteva odobrenje administratora.</div>
        }
      </div>

      <div class="grid cols-2">
        <div class="field">
          <label for="username">Korisničko ime *</label>
          <input id="username" name="username" [(ngModel)]="m.username" required minlength="3">
          @if (touchedInvalid('username')) { <div class="error-text">Minimum 3 karaktera.</div> }
        </div>
        <div class="field">
          <label for="password">Lozinka *</label>
          <input id="password" name="password" type="password" [(ngModel)]="m.password" required>
          <div class="hint">8-12 karaktera, počinje slovom, bar 1 veliko slovo, 1 broj i 1 specijalni karakter.</div>
          @if (m.password && !pwOk()) { <div class="error-text">Lozinka ne zadovoljava pravila.</div> }
        </div>
        <div class="field">
          <label for="firstName">Ime *</label>
          <input id="firstName" name="firstName" [(ngModel)]="m.firstName" required>
        </div>
        <div class="field">
          <label for="lastName">Prezime *</label>
          <input id="lastName" name="lastName" [(ngModel)]="m.lastName" required>
        </div>
        <div class="field">
          <label for="phone">Kontakt telefon *</label>
          <input id="phone" name="phone" [(ngModel)]="m.phone" required>
          @if (m.phone && !phoneOk()) { <div class="error-text">Telefon nije ispravan.</div> }
        </div>
        <div class="field">
          <label for="email">I-mejl adresa *</label>
          <input id="email" name="email" type="email" [(ngModel)]="m.email" required>
          @if (m.email && !emailOk()) { <div class="error-text">I-mejl nije ispravan.</div> }
        </div>
      </div>

      @if (role !== 'INDIVIDUAL') {
        <h3 class="mt">Podaci o instituciji</h3>
        <div class="grid cols-2">
          <div class="field">
            <label for="inst">Naziv institucije *</label>
            <input id="inst" name="institutionName" [(ngModel)]="m.institutionName" required>
          </div>
          <div class="field">
            <label for="addr">Adresa sedišta *</label>
            <input id="addr" name="address" [(ngModel)]="m.address" required>
          </div>
          <div class="field">
            <label for="city">Grad *</label>
            <input id="city" name="city" [(ngModel)]="m.city" required>
          </div>
          <div class="field">
            <label for="mb">Matični broj *</label>
            <input id="mb" name="companyNumber" [(ngModel)]="m.companyNumber" maxlength="8" required>
            <div class="hint">Tačno 8 cifara.</div>
            @if (m.companyNumber && !mbOk()) { <div class="error-text">Matični broj mora imati tačno 8 cifara.</div> }
          </div>
          <div class="field">
            <label for="pib">PIB *</label>
            <input id="pib" name="pib" [(ngModel)]="m.pib" maxlength="9" required>
            <div class="hint">9 cifara, ne počinje nulom.</div>
            @if (m.pib && !pibOk()) { <div class="error-text">PIB nije ispravan.</div> }
          </div>
          <div class="field">
            <label for="lat">Geo. širina / dužina (za mapu)</label>
            <div style="display:flex;gap:8px">
              <input id="lat" name="lat" [(ngModel)]="m.lat" placeholder="44.8125">
              <input id="lng" name="lng" [(ngModel)]="m.lng" placeholder="20.4612">
            </div>
          </div>
        </div>
      }

      <div class="field">
        <label for="img">Profilna slika (JPG/PNG/GIF, 100x100 – 250x250 px)</label>
        <input id="img" name="img" type="file" accept="image/jpeg,image/png,image/gif" (change)="onFile($event)">
        <div class="hint">Ako ne dodate sliku, dobićete podrazumevanu default_profile_image.jpg.</div>
        @if (imgError()) { <div class="error-text">{{ imgError() }}</div> }
        @if (preview()) { <img [src]="preview()" alt="Pregled" style="margin-top:8px;border-radius:8px;max-width:150px"> }
      </div>

      <div class="actions">
        <button type="submit" [disabled]="!formOk() || loading()">
          {{ loading() ? 'Slanje...' : 'Registruj se' }}
        </button>
        <a class="btn btn-ghost" routerLink="/login">Nazad na prijavu</a>
      </div>
    </form>
  </div>`
})
export class Register implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  role: Role = 'INDIVIDUAL';
  m: any = { username: '', password: '', firstName: '', lastName: '', phone: '', email: '',
             institutionName: '', address: '', city: '', companyNumber: '', pib: '', lat: '', lng: '' };
  file: File | null = null;
  preview = signal(''); imgError = signal('');
  error = signal(''); info = signal(''); loading = signal(false);

  ngOnInit() {}
  touchedInvalid(field: string) { return this.m[field] && this.m[field].length < 3; }
  pwOk() { return PASSWORD_REGEX.test(this.m.password); }
  emailOk() { return EMAIL_REGEX.test(this.m.email); }
  phoneOk() { return PHONE_REGEX.test(this.m.phone); }
  mbOk() { return /^\d{8}$/.test(this.m.companyNumber); }
  pibOk() { return /^[1-9]\d{8}$/.test(this.m.pib); }

  formOk() {
    const base = this.m.username.length >= 3 && this.pwOk() && this.m.firstName && this.m.lastName
      && this.phoneOk() && this.emailOk() && !this.imgError();
    if (this.role === 'INDIVIDUAL') return base;
    return base && this.m.institutionName && this.m.address && this.m.city && this.mbOk() && this.pibOk();
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.imgError.set(''); this.preview.set(''); this.file = null;
    const f = input.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(f.type)) {
      this.imgError.set('Dozvoljeni su samo JPG, PNG i GIF formati.'); return;
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      if (img.width < 100 || img.height < 100 || img.width > 250 || img.height > 250) {
        this.imgError.set(`Slika mora biti između 100x100 i 250x250 px (izabrana je ${img.width}x${img.height}).`);
      } else {
        this.file = f; this.preview.set(url);
      }
    };
    img.src = url;
  }

  submit() {
    this.error.set(''); this.info.set(''); this.loading.set(true);
    const fd = new FormData();
    fd.append('role', this.role);
    ['username','password','firstName','lastName','phone','email'].forEach(k => fd.append(k, this.m[k]));
    if (this.role !== 'INDIVIDUAL')
      ['institutionName','address','city','companyNumber','pib','lat','lng']
        .forEach(k => { if (this.m[k]) fd.append(k, this.m[k]); });
    if (this.file) fd.append('profileImage', this.file);

    this.auth.register(fd).subscribe({
      next: r => {
        this.loading.set(false); this.info.set(r.message);
        setTimeout(() => this.router.navigateByUrl('/login'), 2500);
      },
      error: e => { this.loading.set(false); this.error.set(e.error?.message || 'Registracija nije uspela.'); }
    });
  }
}
