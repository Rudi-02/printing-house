import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="center-page">
    <div class="card">
      <h1>Prijava na sistem</h1>
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
      <form (ngSubmit)="submit()" #f="ngForm">
        <div class="field">
          <label for="u">Korisničko ime</label>
          <input id="u" name="username" [(ngModel)]="username" required autocomplete="username">
        </div>
        <div class="field">
          <label for="p">Lozinka</label>
          <input id="p" name="password" type="password" [(ngModel)]="password" required autocomplete="current-password">
        </div>
        <button type="submit" [disabled]="!f.valid || loading()">
          {{ loading() ? 'Prijavljivanje...' : 'Prijavi se' }}
        </button>
      </form>
      <p class="mt"><a routerLink="/forgot-password">Zaboravili ste lozinku?</a></p>
      <p class="muted">Nemate nalog? <a routerLink="/register">Registrujte se</a></p>
    </div>
  </div>`
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  username = ''; password = '';
  error = signal(''); loading = signal(false);

  submit() {
    this.error.set(''); this.loading.set(true);
    this.auth.login(this.username, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigateByUrl(this.auth.homeRoute()); },
      error: e => { this.loading.set(false); this.error.set(e.error?.message || 'Prijava nije uspela.'); }
    });
  }
}
