import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { profileImg } from '../../core/api';

@Component({
  selector: 'app-printer-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="card">
    <h1>Profil štamparije</h1>
    @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
    @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

    <div class="grid cols-2">
      <div>
        <img [src]="preview() || img(m.profileImage)" alt="Profilna slika"
             style="width:150px;height:150px;object-fit:cover;border-radius:10px;border:2px solid var(--accent)">
        <div class="field mt">
          <label for="pi">Promeni profilnu sliku</label>
          <input id="pi" type="file" accept="image/jpeg,image/png,image/gif" (change)="onFile($event)">
          <div class="hint">JPG/PNG/GIF, 100x100 – 250x250 px.</div>
          @if (imgErr()) { <div class="error-text">{{ imgErr() }}</div> }
        </div>
      </div>

      <form (ngSubmit)="save()">
        <div class="field">
          <label for="un">Korisničko ime</label>
          <input id="un" [value]="m.username" disabled>
          <div class="hint">Korisničko ime nije moguće promeniti.</div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label for="fn">Ime odgovornog lica</label><input id="fn" name="firstName" [(ngModel)]="m.firstName"></div>
          <div class="field"><label for="ln">Prezime odgovornog lica</label><input id="ln" name="lastName" [(ngModel)]="m.lastName"></div>
          <div class="field"><label for="ph">Telefon</label><input id="ph" name="phone" [(ngModel)]="m.phone"></div>
          <div class="field"><label for="em">I-mejl</label><input id="em" name="email" type="email" [(ngModel)]="m.email"></div>
          <div class="field"><label for="inst">Naziv štamparije</label><input id="inst" name="institutionName" [(ngModel)]="m.institutionName"></div>
          <div class="field"><label for="ad">Adresa sedišta</label><input id="ad" name="address" [(ngModel)]="m.address"></div>
          <div class="field"><label for="ci">Grad</label><input id="ci" name="city" [(ngModel)]="m.city"></div>
          <div class="field"><label for="mb">PIB / Matični broj</label>
            <input id="mb" [value]="m.pib + ' / ' + m.companyNumber" disabled></div>
          <div class="field"><label for="lat">Geo. širina</label><input id="lat" name="lat" [(ngModel)]="m.lat" placeholder="44.8125"></div>
          <div class="field"><label for="lng">Geo. dužina</label><input id="lng" name="lng" [(ngModel)]="m.lng" placeholder="20.4612"></div>
        </div>
        <button type="submit">Sačuvaj izmene</button>
      </form>
    </div>
  </div>`
})
export class PrinterProfile implements OnInit {
  private data = inject(DataService);
  private auth = inject(AuthService);
  img = profileImg;
  m: any = {};
  file: File | null = null;
  preview = signal(''); imgErr = signal(''); msg = signal(''); err = signal('');

  ngOnInit() { this.data.getProfile().subscribe(u => this.m = { ...u }); }

  onFile(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.imgErr.set(''); this.file = null; this.preview.set('');
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(f.type)) {
      this.imgErr.set('Dozvoljeni su samo JPG, PNG i GIF formati.'); return;
    }
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      if (im.width < 100 || im.height < 100 || im.width > 250 || im.height > 250)
        this.imgErr.set(`Slika mora biti između 100x100 i 250x250 px (izabrana je ${im.width}x${im.height}).`);
      else { this.file = f; this.preview.set(url); }
    };
    im.src = url;
  }

  save() {
    this.msg.set(''); this.err.set('');
    const fd = new FormData();
    ['firstName','lastName','phone','email','institutionName','address','city','lat','lng']
      .forEach(k => { if (this.m[k] !== undefined && this.m[k] !== null && this.m[k] !== '') fd.append(k, this.m[k]); });
    if (this.file) fd.append('profileImage', this.file);
    this.data.updateProfile(fd).subscribe({
      next: r => { this.msg.set(r.message); this.auth.setUser(r.user); this.m = { ...r.user }; this.preview.set(''); },
      error: e => this.err.set(e.error?.message || 'Ažuriranje nije uspelo.')
    });
  }
}
