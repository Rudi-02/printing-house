import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { productImg } from '../../core/api';
import { Product } from '../../core/models';

@Component({
  selector: 'app-printer-stock',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="card">
    <h1>Ažuriranje količina</h1>
    <p class="muted">Za sve postojeće proizvode možete promeniti trenutnu količinu na lageru.</p>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    @if (!products().length) { <p class="muted">Nemate unetih proizvoda.</p> }
    @if (products().length) {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Slika</th><th>Proizvod</th><th>Kategorija</th><th>Cena</th><th>Trenutno stanje</th><th>Nova količina</th><th></th></tr></thead>
          <tbody>
            @for (p of products(); track p._id) {
              <tr>
                <td><img [src]="img(p.mainImage)" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:6px"></td>
                <td><strong>{{ p.name }}</strong></td>
                <td>{{ catName(p) }}</td>
                <td>{{ p.price }} RSD</td>
                <td><span class="badge" [class]="p.quantity > 0 ? 'received' : 'ordered'">{{ p.quantity }} kom</span></td>
                <td style="max-width:130px"><input type="number" min="0" [(ngModel)]="edits[p._id]" [ngModelOptions]="{standalone:true}"></td>
                <td><button class="btn-sm" (click)="save(p)">Sačuvaj</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>`
})
export class PrinterStock implements OnInit {
  private data = inject(DataService);
  img = productImg;
  products = signal<Product[]>([]);
  edits: Record<string, number> = {};
  msg = signal(''); err = signal('');

  ngOnInit() { this.load(); }
  load() {
    this.data.myProducts().subscribe(p => {
      this.products.set(p);
      p.forEach(x => this.edits[x._id] = x.quantity);
    });
  }
  catName(p: Product) { return typeof p.category === 'object' ? (p.category as any).name : ''; }

  save(p: Product) {
    this.msg.set(''); this.err.set('');
    const q = Number(this.edits[p._id]);
    if (isNaN(q) || q < 0) { this.err.set('Količina mora biti nenegativan broj.'); return; }
    this.data.updateQuantity(p._id, q).subscribe({
      next: r => { this.msg.set(`${p.name}: ${r.message}`); this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }
}
