import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="center-page">
    <div class="card">
      <h1>Poništavanje lozinke</h1>
      <p class="muted">Unesite korisničko ime ili i-mejl adresu. Poslaćemo Vam link koji važi <b>5 minuta</b>.</p>
      @if (info()) { <div class="alert alert-ok">{{ info() }}</div> }
      @if (devLink()) {
        <div class="alert alert-info">
          Razvojni link (u produkciji stiže samo na i-mejl):<br>
          <a [href]="devLink()">{{ devLink() }}</a>
        </div>
      }
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
      <form (ngSubmit)="submit()" #f="ngForm">
        <div class="field">
          <label for="id">Korisničko ime ili i-mejl</label>
          <input id="id" name="identifier" [(ngModel)]="identifier" required>
        </div>
        <button type="submit" [disabled]="!f.valid || loading()">Pošalji link</button>
      </form>
      <p class="mt"><a routerLink="/login">Nazad na prijavu</a></p>
    </div>
  </div>`
})
export class ForgotPassword {
  private auth = inject(AuthService);
  identifier = '';
  info = signal(''); error = signal(''); devLink = signal(''); loading = signal(false);

  submit() {
    this.error.set(''); this.info.set(''); this.loading.set(true);
    this.auth.forgotPassword(this.identifier).subscribe({
      next: r => { this.loading.set(false); this.info.set(r.message); if (r.devLink) this.devLink.set(r.devLink); },
      error: e => { this.loading.set(false); this.error.set(e.error?.message || 'Greška.'); }
    });
  }
}
