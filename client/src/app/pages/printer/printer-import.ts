import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';

@Component({
  selector: 'app-printer-import',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="card">
    <h1>Dodavanje iz fajla</h1>
    <p class="muted">Unesite lager listu putem JSON fajla. Nakon učitavanja, u drugom koraku dodajte slike za svaki uvezeni proizvod.</p>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    <h2>Korak 1 — učitavanje JSON fajla</h2>
    <div class="field">
      <label for="jf">JSON fajl sa lager listom</label>
      <input id="jf" type="file" accept="application/json,.json" (change)="onFile($event)">
    </div>
    <button (click)="upload()" [disabled]="!file || loading()">
      {{ loading() ? 'Učitavanje...' : 'Učitaj lager listu' }}
    </button>

    <details class="mt">
      <summary style="cursor:pointer;font-weight:600">Očekivani format fajla</summary>
      <pre style="background:#f3f5fa;padding:12px;border-radius:8px;overflow:auto;font-size:12.5px">{{ sample }}</pre>
    </details>
  </div>

  @if (skipped().length) {
    <div class="card">
      <h2>Preskočene stavke</h2>
      <ul>
        @for (s of skipped(); track $index) { <li>{{ s.name }} — {{ s.reason }}</li> }
      </ul>
    </div>
  }

  @if (created().length) {
    <div class="card">
      <h2>Korak 2 — dodavanje slika</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Proizvod</th><th>Glavna slika</th><th>Dodatne slike (do 3)</th><th></th></tr></thead>
          <tbody>
            @for (c of created(); track c._id) {
              <tr>
                <td><strong>{{ c.name }}</strong></td>
                <td><input type="file" accept="image/jpeg,image/png,image/gif" (change)="setMain(c._id, $event)"></td>
                <td><input type="file" accept="image/jpeg,image/png,image/gif" multiple (change)="setGallery(c._id, $event)"></td>
                <td>
                  <button class="btn-sm" (click)="saveImages(c)">Sačuvaj slike</button>
                  @if (done()[c._id]) { <span class="badge received" style="margin-left:6px">✓</span> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  }`
})
export class PrinterImport {
  private data = inject(DataService);
  file: File | null = null;
  created = signal<{ _id: string; name: string }[]>([]);
  skipped = signal<any[]>([]);
  done = signal<Record<string, boolean>>({});
  msg = signal(''); err = signal(''); loading = signal(false);

  private mains: Record<string, File> = {};
  private galleries: Record<string, File[]> = {};

  sample = `{
  "products": [
    {
      "name": "Hemijska olovka Classic",
      "description": "Plasticna hemijska olovka za tampon stampu.",
      "category": "Stampa malih formata",
      "subcategory": "Olovke",
      "price": 65,
      "quantity": 800,
      "colors": ["bela", "plava"],
      "services": [
        { "name": "Tampon stampa", "maxWidth": 40, "maxHeight": 6, "extraPrice": 25 }
      ]
    }
  ]
}`;

  onFile(ev: Event) { this.file = (ev.target as HTMLInputElement).files?.[0] ?? null; }
  setMain(id: string, ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) this.mains[id] = f;
  }
  setGallery(id: string, ev: Event) {
    this.galleries[id] = Array.from((ev.target as HTMLInputElement).files ?? []).slice(0, 3);
  }

  upload() {
    if (!this.file) return;
    this.msg.set(''); this.err.set(''); this.loading.set(true);
    const fd = new FormData();
    fd.append('file', this.file);
    this.data.importProducts(fd).subscribe({
      next: r => {
        this.loading.set(false); this.msg.set(r.message);
        this.created.set(r.created); this.skipped.set(r.skipped || []);
      },
      error: e => { this.loading.set(false); this.err.set(e.error?.message || 'Uvoz nije uspeo.'); }
    });
  }

  saveImages(c: { _id: string; name: string }) {
    const fd = new FormData();
    if (this.mains[c._id]) fd.append('mainImage', this.mains[c._id]);
    (this.galleries[c._id] || []).forEach(f => fd.append('images', f));
    this.data.uploadProductImages(c._id, fd).subscribe({
      next: () => { this.done.set({ ...this.done(), [c._id]: true }); this.msg.set(`Slike za "${c.name}" su sačuvane.`); },
      error: e => this.err.set(e.error?.message || 'Čuvanje slika nije uspelo.')
    });
  }
}
