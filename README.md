# Printing House

A web platform that connects **customers** with **printing houses**. Customers browse products,
configure a print job (text and/or artwork overlaid on the product image), order, pay, track
delivery and rate the result. Printing houses manage their catalogue, stock and incoming orders,
bid on public tenders, and produce reports. An **administrator** approves accounts, manages
categories and reads platform statistics.

> Course project for *Internet Application Programming* — School of Electrical Engineering,
> University of Belgrade, 2025/2026.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20 — standalone components, signals, lazy-loaded routes |
| Backend | Node.js + Express, REST API on port `4000` |
| Database | MongoDB (`printing-house-db`), Mongoose schemas — collections are created automatically |
| Auth | JWT (role-based), bcrypt password hashing |
| Uploads | Multipart file upload, server-side image validation (`image-size`) |
| Documents | PDFKit for invoices and reports, nodemailer for email delivery |
| Charts | Chart.js (admin statistics) |
| Payments | Card form with Luhn validation; Stripe credentials in `.env` |

---

## Project structure

```
printing-house/
├── server/                      # Express + Mongoose (REST API, port 4000)
│   ├── src/
│   │   ├── config/              # database connection, constants, regular expressions
│   │   ├── models/              # User, Category, Product, Cart, Invoice, Tender,
│   │   │                        # Comment, Rating, PasswordReset
│   │   ├── middleware/          # JWT auth/authorisation, file upload, error handling
│   │   ├── utils/               # validators, nodemailer, PDFKit generators
│   │   ├── controllers/         # auth, user, category, product, cart, order, tender, admin
│   │   ├── routes/index.js      # all REST routes
│   │   └── server.js            # entry point
│   ├── uploads/                 # profiles / products / prints / pdf
│   ├── sample-inventory.json    # example inventory file for import (Appendix 1)
│   └── .env.example
└── client/                      # Angular 20 (standalone components, lazy routes)
    └── src/app/
        ├── core/                # models, AuthService, DataService, interceptor, guards
        └── pages/               # home, auth, product-details, client, printer, admin
```

---

## Running it

**1 — Database.** Start MongoDB locally. The `printing-house-db` database is created on first use;
the assignment does not ship collection scripts, since Mongoose schemas define them.

**2 — Server**

```bash
cd server
npm install
cp .env.example .env      # fill in SMTP / Stripe credentials if needed
npm run dev               # http://localhost:4000
```

**3 — Client**

```bash
cd client
npm install
npm start                 # http://localhost:4200
```

**Administrator account.** Registration of administrators is not implemented, as required by the
assignment. Insert the account directly into the database (`role: "ADMIN"`, `status: "APPROVED"`,
bcrypt-hashed password). Administrators sign in through a separate, unlinked route: **`/admin-login`**.

**Default images.** Place `default_profile_image.jpg` in `server/uploads/profiles/` and
`default_product.jpg` in `server/uploads/products/`.

---

## Features

### Authentication and registration

- Sign-in with username and password; an explicit error message on bad credentials.
- **Forgot password** — link below the form, enter username or email, a temporary link is emailed
  and **valid for 5 minutes** (TTL index in the database plus a server-side check).
- A separate, publicly unlinked form for the administrator (`/admin-login`).
- Individuals are activated immediately; companies and printing houses are created with status
  `PENDING` and wait for administrator approval.
- Password validated by regular expression (8–12 characters, starts with a letter, at least one
  uppercase letter, one digit, one special character) **on the client in JavaScript and again on
  the server**; stored bcrypt-hashed.
- Company registration number: exactly 8 digits and unique. Tax ID (PIB): 9 digits, must not start
  with zero, unique. Username and email are unique across the system.
- Profile image only through the file-upload dialog; 100×100 – 250×250 px, JPG/PNG/GIF — validated
  both in the browser and on the server (`image-size`); anything else falls back to
  `default_profile_image.jpg`.

### Anonymous visitors

- Total number of registered printing houses and the **top 5** products by number of likes.
- Search by name and/or category; the dropdown defaults to "All categories" and lists only
  categories that currently have active products in stock.
- Results in a table with a **DETAILS** button; alphabetical sorting (ascending/descending) by
  clicking a column header.
- Product details page: name, printing house, city, likes/dislikes and a gallery (main image plus
  up to 3 thumbnails); the selected main image is **remembered in a browser cookie**.

### Customers

- **Profile:** view and update details (username is locked) and change the profile image. Below it,
  a sortable table of all orders: invoice ID, printing house, city, numbered products with
  quantities, total in RSD, and a **Cancel** button available only while the status is `ordered`.
- **Product search:** an expanded details page (description, price per unit, colour selection —
  white by default, print types with maximum dimensions and additional cost) and a **map** of the
  printing house's location.
- **Configuring the product** (NEXT): enter text and/or upload an image that is rendered over the
  product photo (CSS overlay, X/Y offset, text colour and size), choose a quantity, then
  **ADD TO CART**, **RESET** or **BACK**. Out-of-stock products are hidden; requesting more than
  available shows "Not enough products currently in stock".
- **Cart:** items grouped by printing house; checkout creates a separate invoice per printing
  house. Invoices are generated as PDFs (PDFKit) and emailed to the customer (nodemailer).
- **Payment:** card type, card number, CVC and expiry (MM/YY), with Luhn and expiry-date validation.
  Success moves the order to the intermediate `paid` status; failure shows a message and the step
  is retried.
- **Public tenders** (companies only): checkout does not create invoices but opens a 10-minute
  tender, and every printing house receives an email with the required product list. The tender is
  closed on the customer's next sign-in (no timer or WebSocket) by selecting the lowest total offer
  that has sufficient stock; an invoice is then created with status `in print`.
- **Archive:** shipped and received products, sorted by order date and by name / quantity /
  printing house; transition `shipped` → `received`; like/dislike and comment on received products.
  The user's own comments are framed with an **orange dashed border**.

### Printing houses

- **Profile** with the same update rules.
- **Products and services:** add/edit/delete products in predefined categories and subcategories,
  unit price, colours, main image plus up to 3 additional images, and services (name, maximum
  dimensions, additional cost per unit).
- **Stock update** for all existing products.
- **Bulk import:** load an inventory list from a JSON file, then attach images per product in a
  second step.
- **Incoming orders:** transitions `ordered`/`paid` → `in print` → `shipped`.
- **Tenders:** one bid per tender, with a price for every requested product and an availability flag.
- **Reporting:** a PDF report of all received offers and the winning bid.

### Administrator

- Browse, update and delete all user accounts, with filtering and search.
- A dedicated table of pending accounts with approve/reject actions (email notification included).
- Manage product categories and subcategories.
- **Statistics (Chart.js):** a bar chart of printing-house revenue for the last quarter; a pie chart
  of the most ordered products in the last month (quantity and percentage); a line chart of product
  rating over time, with individual products toggleable.

### Cross-cutting

- Uniform look through a single CSS file, shared header/footer and menu on every page, a
  "Log out" link and return to the landing screen.
- **Responsive** layout: mobile menu, wrapping grids, horizontally scrollable tables.
- Resistant to malformed input: validation on the client and, mandatorily, on the server;
  centralised error handling with a single message format.
- Role-based authorisation through JWT, with route protection on the client (guards) and on the
  server (middleware).

---

## Order status flow

```
ordered → [paid] → in print → shipped → received
```

Stored values, in order: `naruceno` → [`placeno`] → `u stampi` → `isporuceno` → `primljeno`.
The `paid` state applies only to card payments; tender-based orders skip it and enter `in print`.

---

## API overview

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | registration (multipart, profile image) |
| POST | `/api/auth/login`, `/api/auth/admin/login` | user / administrator sign-in |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password` | password reset (5-minute link) |
| GET | `/api/public/stats`, `/api/public/products`, `/api/public/products/:id` | landing page and public search |
| GET/PUT | `/api/profile` | profile and updates |
| GET/POST/PUT/PATCH/DELETE | `/api/printer/products...` | products, stock, images, JSON import |
| GET/PATCH | `/api/printer/orders...` | incoming orders and status changes |
| GET/POST | `/api/printer/tenders...` | open tenders and bids |
| GET/POST/DELETE | `/api/cart...` | shopping cart |
| POST | `/api/orders/checkout`, `/api/orders/pay` | invoice creation and payment |
| GET | `/api/orders/:id/pdf` | invoice PDF |
| GET/PATCH/POST | `/api/archive`, `/api/orders/:id/received`, `/api/ratings` | archive, receipt, ratings |
| GET/POST | `/api/tenders...` | company tenders and PDF report |
| GET/PATCH/PUT/DELETE | `/api/admin/users...` | account management and approval requests |
| GET | `/api/admin/stats/...` | data for the three admin charts |

---

## Implementation notes

**Validation on both sides is deliberate.** Client-side checks exist for fast feedback; the server
re-validates everything because a client check is a convenience, not a guarantee. All error
responses share one format so the UI can render them without special cases.

**Tenders close lazily.** Closing happens when the customer signs in again, not on a timer. That
keeps the backend stateless with respect to time — no scheduler, no WebSocket — and is documented
in the assignment's scope. The trade-off is that a tender can stay open slightly longer than ten
minutes; the window is a business rule, not a hard technical boundary.

**One CSS file, no UI framework.** The look is defined by a single stylesheet and shared header,
footer and menu components, so every page stays visually consistent without pulling in a component
library.
