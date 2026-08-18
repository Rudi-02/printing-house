import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="center-page">
    <div class="card" style="border-top:4px solid var(--accent)">
      <h1>Administratorska prijava</h1>
      <p class="muted">Pristup je dozvoljen samo administratoru sistema.</p>
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
      <form (ngSubmit)="submit()" #f="ngForm">
        <div class="field">
          <label for="au">Korisničko ime</label>
          <input id="au" name="username" [(ngModel)]="username" required>
        </div>
        <div class="field">
          <label for="ap">Lozinka</label>
          <input id="ap" name="password" type="password" [(ngModel)]="password" required>
        </div>
        <button type="submit" [disabled]="!f.valid || loading()">
          {{ loading() ? 'Prijavljivanje...' : 'Prijavi se' }}
        </button>
      </form>
    </div>
  </div>`
})
export class AdminLogin {
  private auth = inject(AuthService);
  private router = inject(Router);
  username = ''; password = '';
  error = signal(''); loading = signal(false);

  submit() {
    this.error.set(''); this.loading.set(true);
    this.auth.adminLogin(this.username, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigateByUrl('/admin/users'); },
      error: e => { this.loading.set(false); this.error.set(e.error?.message || 'Prijava nije uspela.'); }
    });
  }
}
