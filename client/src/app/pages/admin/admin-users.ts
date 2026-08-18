import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data.service';
import { profileImg } from '../../core/api';
import { User } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="card">
    <h1>Upravljanje korisnicima</h1>
    <div class="grid cols-3">
      <div class="field">
        <label for="fr">Tip korisnika</label>
        <select id="fr" name="role" [(ngModel)]="role" (ngModelChange)="load()">
          <option value="">Svi tipovi</option>
          <option value="INDIVIDUAL">Fizičko lice</option>
          <option value="LEGAL">Pravno lice</option>
          <option value="PRINTER">Štamparija</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </div>
      <div class="field">
        <label for="fs">Status</label>
        <select id="fs" name="status" [(ngModel)]="status" (ngModelChange)="load()">
          <option value="">Svi statusi</option>
          <option value="PENDING">Na čekanju</option>
          <option value="APPROVED">Odobren</option>
          <option value="REJECTED">Odbijen</option>
        </select>
      </div>
      <div class="field">
        <label for="fq">Pretraga</label>
        <input id="fq" name="q" [(ngModel)]="q" placeholder="korisničko ime, i-mejl, institucija">
      </div>
    </div>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    <h2>Korisnici ({{ filtered().length }})</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th></th><th>Korisničko ime</th><th>Ime i prezime</th><th>Kontakt</th>
              <th>Tip</th><th>Institucija</th><th>Status</th><th>Registrovan</th><th></th></tr>
        </thead>
        <tbody>
          @for (u of filtered(); track u._id) {
            <tr>
              <td><img [src]="img(u.profileImage)" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover"></td>
              <td><strong>{{ u.username }}</strong></td>
              <td>{{ u.firstName }} {{ u.lastName }}</td>
              <td>{{ u.email }}<div class="muted" style="font-size:12px">{{ u.phone }}</div></td>
              <td>{{ roleLabel(u.role) }}</td>
              <td>
                @if (u.institutionName) {
                  {{ u.institutionName }}
                  <div class="muted" style="font-size:12px">PIB {{ u.pib }} · MB {{ u.companyNumber }}</div>
                  <div class="muted" style="font-size:12px">{{ u.address }}, {{ u.city }}</div>
                } @else { <span class="muted">—</span> }
              </td>
              <td><span class="badge" [class]="statusClass(u.status)">{{ statusLabel(u.status) }}</span></td>
              <td>{{ u.createdAt | date:'dd.MM.yyyy.' }}</td>
              <td>
                <div class="actions">
                  <button class="btn-sm btn-ghost" (click)="edit(u)">Izmeni</button>
                  <button class="btn-sm btn-danger" (click)="remove(u)">Obriši</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </div>

  @if (editing(); as u) {
    <div class="card" style="border-top:4px solid var(--accent)">
      <h2>Izmena korisnika — {{ u.username }}</h2>
      <form (ngSubmit)="save()">
        <div class="grid cols-2">
          <div class="field"><label for="e1">Ime</label><input id="e1" name="firstName" [(ngModel)]="m.firstName"></div>
          <div class="field"><label for="e2">Prezime</label><input id="e2" name="lastName" [(ngModel)]="m.lastName"></div>
          <div class="field"><label for="e3">Telefon</label><input id="e3" name="phone" [(ngModel)]="m.phone"></div>
          <div class="field"><label for="e4">I-mejl</label><input id="e4" name="email" type="email" [(ngModel)]="m.email"></div>
          @if (u.role !== 'INDIVIDUAL' && u.role !== 'ADMIN') {
            <div class="field"><label for="e5">Institucija</label><input id="e5" name="institutionName" [(ngModel)]="m.institutionName"></div>
            <div class="field"><label for="e6">Adresa</label><input id="e6" name="address" [(ngModel)]="m.address"></div>
            <div class="field"><label for="e7">Grad</label><input id="e7" name="city" [(ngModel)]="m.city"></div>
            <div class="field"><label for="e8">Matični broj</label><input id="e8" name="companyNumber" [(ngModel)]="m.companyNumber" maxlength="8"></div>
            <div class="field"><label for="e9">PIB</label><input id="e9" name="pib" [(ngModel)]="m.pib" maxlength="9"></div>
          }
          <div class="field">
            <label for="e10">Status</label>
            <select id="e10" name="status" [(ngModel)]="m.status">
              <option value="PENDING">Na čekanju</option>
              <option value="APPROVED">Odobren</option>
              <option value="REJECTED">Odbijen</option>
            </select>
          </div>
          <div class="field">
            <label for="e11">Nova lozinka (opciono)</label>
            <input id="e11" name="password" type="password" [(ngModel)]="m.password">
            <div class="hint">Ostavite prazno da zadržite postojeću lozinku.</div>
          </div>
        </div>
        <div class="actions">
          <button type="submit">Sačuvaj</button>
          <button type="button" class="btn-ghost" (click)="editing.set(null)">Odustani</button>
        </div>
      </form>
    </div>
  }`
})
export class AdminUsers implements OnInit {
  private data = inject(DataService);
  img = profileImg;
  users = signal<User[]>([]);
  editing = signal<User | null>(null);
  m: any = {};
  role = ''; status = ''; q = '';
  msg = signal(''); err = signal('');

  ngOnInit() { this.load(); }
  load() {
    this.data.adminUsers({ role: this.role, status: this.status })
      .subscribe(u => this.users.set(u));
  }
  filtered() {
    const t = this.q.trim().toLowerCase();
    if (!t) return this.users();
    return this.users().filter(u =>
      [u.username, u.email, u.firstName, u.lastName, u.institutionName]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(t)));
  }
  roleLabel(r: string) {
    return { INDIVIDUAL: 'Fizičko lice', LEGAL: 'Pravno lice', PRINTER: 'Štamparija', ADMIN: 'Administrator' }[r] || r;
  }
  statusLabel(s: string) {
    return { PENDING: 'Na čekanju', APPROVED: 'Odobren', REJECTED: 'Odbijen' }[s] || s;
  }
  statusClass(s: string) {
    return { PENDING: 'ordered', APPROVED: 'received', REJECTED: '' }[s] || '';
  }
  edit(u: User) { this.editing.set(u); this.m = { ...u, password: '' }; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  save() {
    const u = this.editing(); if (!u) return;
    this.msg.set(''); this.err.set('');
    const body = { ...this.m };
    if (!body.password) delete body.password;
    this.data.adminUpdateUser(u._id, body).subscribe({
      next: r => { this.msg.set(r.message); this.editing.set(null); this.load(); },
      error: e => this.err.set(e.error?.message || 'Ažuriranje nije uspelo.')
    });
  }
  remove(u: User) {
    if (!confirm(`Obrisati korisnika "${u.username}"?`)) return;
    this.data.adminDeleteUser(u._id).subscribe({
      next: r => { this.msg.set(r.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Brisanje nije uspelo.')
    });
  }
}
