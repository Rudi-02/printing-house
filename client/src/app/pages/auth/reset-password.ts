import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

const PASSWORD_REGEX = /^(?=[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>\/?\\|`~]).{8,12}$/;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="center-page">
    <div class="card">
      <h1>Postavljanje nove lozinke</h1>
      @if (!valid() && checked()) {
        <div class="alert alert-error">{{ error() || 'Link je istekao. Zatražite novi.' }}</div>
        <a class="btn" routerLink="/forgot-password">Zatraži novi link</a>
      }
      @if (valid()) {
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        @if (info()) { <div class="alert alert-ok">{{ info() }}</div> }
        <form (ngSubmit)="submit()" #f="ngForm">
          <div class="field">
            <label for="np">Nova lozinka</label>
            <input id="np" name="password" type="password" [(ngModel)]="password" required>
            <div class="hint">8-12 karaktera, počinje slovom, bar jedno veliko slovo, broj i specijalni karakter.</div>
            @if (password && !ok()) { <div class="error-text">Lozinka ne zadovoljava pravila.</div> }
          </div>
          <div class="field">
            <label for="cp">Potvrda lozinke</label>
            <input id="cp" name="confirm" type="password" [(ngModel)]="confirm" required>
            @if (confirm && confirm !== password) { <div class="error-text">Lozinke se ne poklapaju.</div> }
          </div>
          <button type="submit" [disabled]="!ok() || password !== confirm">Sačuvaj lozinku</button>
        </form>
      }
    </div>
  </div>`
})
export class ResetPassword implements OnInit {
  @Input() token = '';
  private auth = inject(AuthService);
  private router = inject(Router);
  password = ''; confirm = '';
  valid = signal(false); checked = signal(false);
  error = signal(''); info = signal('');

  ok() { return PASSWORD_REGEX.test(this.password); }

  ngOnInit() {
    this.auth.validateResetToken(this.token).subscribe({
      next: r => { this.valid.set(r.valid); this.checked.set(true); if (!r.valid) this.error.set(r.message); },
      error: () => { this.checked.set(true); this.error.set('Link nije validan.'); }
    });
  }
  submit() {
    this.error.set('');
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: r => { this.info.set(r.message); setTimeout(() => this.router.navigateByUrl('/login'), 1500); },
      error: e => this.error.set(e.error?.message || 'Greška pri promeni lozinke.')
    });
  }
}
