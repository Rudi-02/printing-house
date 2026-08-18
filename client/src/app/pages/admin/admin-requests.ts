import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data.service';
import { profileImg } from '../../core/api';
import { User } from '../../core/models';

@Component({
  selector: 'app-admin-requests',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="card">
    <h1>Zahtevi za registraciju</h1>
    <p class="muted">Tabelarni pregled svih neodobrenih korisnika. Ishod može biti prihvatanje ili odbacivanje zahteva.</p>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    @if (!pending().length) { <p class="muted">Nema zahteva koji čekaju odobrenje.</p> }
    @if (pending().length) {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th></th><th>Korisničko ime</th><th>Odgovorno lice</th><th>Kontakt</th>
                <th>Tip</th><th>Institucija</th><th>Podneto</th><th>Odluka</th></tr>
          </thead>
          <tbody>
            @for (u of pending(); track u._id) {
              <tr>
                <td><img [src]="img(u.profileImage)" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover"></td>
                <td><strong>{{ u.username }}</strong></td>
                <td>{{ u.firstName }} {{ u.lastName }}</td>
                <td>{{ u.email }}<div class="muted" style="font-size:12px">{{ u.phone }}</div></td>
                <td>{{ u.role === 'PRINTER' ? 'Štamparija' : 'Pravno lice' }}</td>
                <td>
                  <strong>{{ u.institutionName }}</strong>
                  <div class="muted" style="font-size:12px">PIB {{ u.pib }} · MB {{ u.companyNumber }}</div>
                  <div class="muted" style="font-size:12px">{{ u.address }}, {{ u.city }}</div>
                </td>
                <td>{{ u.createdAt | date:'dd.MM.yyyy. HH:mm' }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-sm btn-ok" (click)="approve(u)">Prihvati</button>
                    <button class="btn-sm btn-danger" (click)="reject(u)">Odbaci</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>`
})
export class AdminRequests implements OnInit {
  private data = inject(DataService);
  img = profileImg;
  pending = signal<User[]>([]);
  msg = signal(''); err = signal('');

  ngOnInit() { this.load(); }
  load() { this.data.pendingUsers().subscribe(u => this.pending.set(u)); }

  approve(u: User) {
    this.data.approveUser(u._id).subscribe({
      next: r => { this.msg.set(`${u.username}: ${r.message}`); this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }
  reject(u: User) {
    const reason = prompt(`Razlog odbijanja zahteva korisnika "${u.username}" (opciono):`) ?? '';
    this.data.rejectUser(u._id, reason).subscribe({
      next: r => { this.msg.set(`${u.username}: ${r.message}`); this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }
}
