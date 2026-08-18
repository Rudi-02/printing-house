import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { productImg } from '../../core/api';
import { Category, PrintService, Product } from '../../core/models';

@Component({
  selector: 'app-printer-products',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="card spread">
    <h1 style="margin:0">Proizvodi i usluge</h1>
    <button (click)="toggleForm()">{{ showForm() ? 'Zatvori formu' : '+ Novi proizvod' }}</button>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  @if (showForm()) {
    <div class="card" style="border-top:4px solid var(--accent)">
      <h2>{{ editing() ? 'Izmena proizvoda' : 'Novi proizvod' }}</h2>
      <form (ngSubmit)="save()">
        <div class="grid cols-2">
          <div class="field"><label for="n">Naziv proizvoda *</label><input id="n" name="name" [(ngModel)]="m.name" required></div>
          <div class="field"><label for="pr">Jedinična cena (RSD) *</label><input id="pr" name="price" type="number" min="0" [(ngModel)]="m.price" required></div>
          <div class="field"><label for="q">Količina na stanju *</label><input id="q" name="quantity" type="number" min="0" [(ngModel)]="m.quantity" required></div>
          <div class="field">
            <label for="cat">Kategorija *</label>
            <select id="cat" name="category" [(ngModel)]="m.category" (ngModelChange)="onCategory()" required>
              <option value="">— izaberite —</option>
              @for (c of categories(); track c._id) { <option [value]="c._id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="sub">Potkategorija</label>
            <select id="sub" name="subcategoryId" [(ngModel)]="m.subcategoryId">
              <option value="">— bez potkategorije —</option>
              @for (s of subcategories(); track s._id) { <option [value]="s._id">{{ s.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="col">Dostupne boje (odvojene zarezom)</label>
            <input id="col" name="colors" [(ngModel)]="m.colors" placeholder="bela, crna, plava">
            <div class="hint">Ako ostavite prazno, koristi se podrazumevana bela.</div>
          </div>
        </div>

        <div class="field">
          <label for="d">Opis proizvoda</label>
          <textarea id="d" name="description" [(ngModel)]="m.description"></textarea>
        </div>

        <div class="grid cols-2">
          <div class="field">
            <label for="mi">Glavna slika proizvoda</label>
            <input id="mi" type="file" accept="image/jpeg,image/png,image/gif" (change)="onMain($event)">
          </div>
          <div class="field">
            <label for="gi">Dodatne slike (najviše 3)</label>
            <input id="gi" type="file" accept="image/jpeg,image/png,image/gif" multiple (change)="onGallery($event)">
          </div>
        </div>

        <h3 class="mt">Usluge (vrste štampe)</h3>
        <p class="hint">Usluge su specijalizovani tipovi štampe ili preslikača koji povećavaju cenu po komadu.</p>
        @for (s of services(); track $index; let i = $index) {
          <div class="grid cols-4" style="align-items:end">
            <div class="field"><label [for]="'sn'+i">Naziv</label>
              <input [id]="'sn'+i" [(ngModel)]="s.name" [ngModelOptions]="{standalone:true}" placeholder="Digitalna FLEKS štampa"></div>
            <div class="field"><label [for]="'sw'+i">Maks. širina (mm)</label>
              <input [id]="'sw'+i" type="number" min="0" [(ngModel)]="s.maxWidth" [ngModelOptions]="{standalone:true}"></div>
            <div class="field"><label [for]="'sh'+i">Maks. visina (mm)</label>
              <input [id]="'sh'+i" type="number" min="0" [(ngModel)]="s.maxHeight" [ngModelOptions]="{standalone:true}"></div>
            <div class="field" style="display:flex;gap:8px">
              <div style="flex:1"><label [for]="'sp'+i">Dodatna cena</label>
                <input [id]="'sp'+i" type="number" min="0" [(ngModel)]="s.extraPrice" [ngModelOptions]="{standalone:true}"></div>
              <button type="button" class="btn-sm btn-danger" (click)="removeService(i)">×</button>
            </div>
          </div>
        }
        <button type="button" class="btn-ghost btn-sm" (click)="addService()">+ Dodaj uslugu</button>

        <div class="actions mt">
          <button type="submit" [disabled]="!formOk()">{{ editing() ? 'Sačuvaj izmene' : 'Dodaj proizvod' }}</button>
          <button type="button" class="btn-ghost" (click)="resetForm()">Poništi</button>
        </div>
      </form>
    </div>
  }

  <div class="card">
    <h2>Moji proizvodi ({{ products().length }})</h2>
    @if (!products().length) { <p class="muted">Još uvek niste dodali nijedan proizvod.</p> }
    @if (products().length) {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Slika</th><th>Naziv</th><th>Kategorija</th><th>Cena</th><th>Stanje</th><th>Usluge</th><th>👍/👎</th><th></th></tr></thead>
          <tbody>
            @for (p of products(); track p._id) {
              <tr>
                <td><img [src]="img(p.mainImage)" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:6px"></td>
                <td><strong>{{ p.name }}</strong></td>
                <td>{{ catName(p) }}@if (p.subcategoryName) { <div class="muted" style="font-size:12px">{{ p.subcategoryName }}</div> }</td>
                <td>{{ p.price }} RSD</td>
                <td>{{ p.quantity }}</td>
                <td>{{ p.services.length }}</td>
                <td>{{ p.likes }} / {{ p.dislikes }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-sm btn-ghost" (click)="edit(p)">Izmeni</button>
                    <button class="btn-sm btn-danger" (click)="remove(p)">Obriši</button>
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
export class PrinterProducts implements OnInit {
  private data = inject(DataService);
  img = productImg;

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  services = signal<PrintService[]>([]);
  showForm = signal(false);
  editing = signal<string | null>(null);
  msg = signal(''); err = signal('');

  m: any = { name: '', price: null, quantity: 0, category: '', subcategoryId: '', colors: '', description: '' };
  mainFile: File | null = null;
  galleryFiles: File[] = [];

  ngOnInit() {
    this.load();
    this.data.categories().subscribe(c => this.categories.set(c));
  }
  load() { this.data.myProducts().subscribe(p => this.products.set(p)); }
  catName(p: Product) { return typeof p.category === 'object' ? (p.category as any).name : ''; }

  subcategories() {
    const c = this.categories().find(x => x._id === this.m.category);
    return c ? c.subcategories : [];
  }
  onCategory() { this.m.subcategoryId = ''; }

  toggleForm() { this.showForm() ? this.resetForm() : this.showForm.set(true); }
  addService() { this.services.set([...this.services(), { name: '', maxWidth: 0, maxHeight: 0, extraPrice: 0 }]); }
  removeService(i: number) { this.services.set(this.services().filter((_, idx) => idx !== i)); }

  onMain(ev: Event) { this.mainFile = (ev.target as HTMLInputElement).files?.[0] ?? null; }
  onGallery(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files ?? []);
    this.galleryFiles = files.slice(0, 3);
  }

  formOk() { return this.m.name && this.m.price !== null && this.m.price >= 0 && this.m.category; }

  resetForm() {
    this.m = { name: '', price: null, quantity: 0, category: '', subcategoryId: '', colors: '', description: '' };
    this.services.set([]); this.mainFile = null; this.galleryFiles = [];
    this.editing.set(null); this.showForm.set(false);
  }

  edit(p: Product) {
    this.editing.set(p._id);
    this.showForm.set(true);
    this.m = {
      name: p.name, price: p.price, quantity: p.quantity,
      category: typeof p.category === 'object' ? (p.category as any)._id : p.category,
      subcategoryId: p.subcategoryId || '',
      colors: (p.colors || []).join(', '),
      description: p.description
    };
    this.services.set(p.services.map(s => ({ ...s })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildForm() {
    const fd = new FormData();
    fd.append('name', this.m.name);
    fd.append('price', String(this.m.price));
    fd.append('quantity', String(this.m.quantity ?? 0));
    fd.append('category', this.m.category);
    if (this.m.subcategoryId) fd.append('subcategoryId', this.m.subcategoryId);
    if (this.m.colors) fd.append('colors', this.m.colors);
    fd.append('description', this.m.description ?? '');
    fd.append('services', JSON.stringify(this.services().filter(s => s.name)));
    if (this.mainFile) fd.append('mainImage', this.mainFile);
    this.galleryFiles.forEach(f => fd.append('images', f));
    return fd;
  }

  save() {
    this.msg.set(''); this.err.set('');
    const fd = this.buildForm();
    const id = this.editing();
    const req = id ? this.data.updateProduct(id, fd) : this.data.createProduct(fd);
    req.subscribe({
      next: () => { this.msg.set(id ? 'Proizvod je ažuriran.' : 'Proizvod je dodat.'); this.resetForm(); this.load(); },
      error: e => this.err.set(e.error?.message || 'Čuvanje nije uspelo.')
    });
  }

  remove(p: Product) {
    if (!confirm(`Obrisati proizvod "${p.name}"?`)) return;
    this.data.deleteProduct(p._id).subscribe({
      next: r => { this.msg.set(r.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Brisanje nije uspelo.')
    });
  }
}
