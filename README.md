# Odoo Cafe POS

Odoo Cafe POS is a full-stack restaurant point-of-sale web application built with Next.js, React, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. It is designed for cafe operations where an admin configures the menu, staff, tables, bookings, coupons, and reports, while employees use the POS terminal to take orders, manage customers, process payments, and send tickets to the kitchen display.

Reference mockup: https://link.excalidraw.com/l/65VNwvy7c4X/1Vvr9oy6B3F

## What this project is about

This project implements a cafe workflow from order creation to kitchen preparation and payment:

1. An admin logs in and configures products, categories, tables, users, bookings, coupons, and promotions.
2. An employee logs in and opens the POS terminal.
3. The employee selects a table or takeout order, adds menu items, applies coupons or automatic promotions, and confirms the order.
4. The order appears in the Kitchen Display System.
5. Kitchen staff can complete or cancel orders and track item quantities.
6. The employee can print or email receipts and review order history.
7. The admin can review sales reports, dashboard metrics, and table activity.

## Tech stack

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js Route Handlers, Prisma ORM
- **Database:** PostgreSQL
- **Authentication:** JWT stored in an HTTP-only cookie
- **Realtime:** Server-Sent Events for floor updates, LiveKit for voice sessions
- **AI / Voice:** Deepgram speech-to-text, Groq extraction, LiveKit voice room
- **Email:** Nodemailer
- **QR:** `qrcode` package and receipt QR rendering
- **State:** React client state with server-side validation and recalculation

## Roles

### Admin

The admin uses the backend/admin panel to manage:

- Products and categories
- Coupons and automated promotions
- Floor plan, tables, and bookings
- Users and staff accounts
- Orders and active kitchen tickets
- Reports and dashboard analytics
- Profile and settings

Admin routes are under `/admin`.

### Employee

The employee uses the POS terminal to:

- Select a table or takeout order
- Search and add products
- Manage customer lookup and creation
- Apply coupon codes
- View automatic promotions
- Confirm orders
- Pay or mark orders
- Print or email receipts
- View KDS tickets and order history

Employee routes are under `/dashboard`, `/pos`, `/kds`, `/orders`, `/book-seat`, and `/profile`.

### Customer

Customers are managed inside the POS terminal. Customer records store:

- Name
- Email
- Phone number
- Order history

## Main modules

### Authentication

The app redirects unauthenticated users to `/login`.

- `POST /api/auth/login` authenticates with email and password.
- `POST /api/auth/register` exists, but the current register page redirects to login.
- `GET /api/auth/me` returns the current user.
- `POST /api/auth/logout` clears the auth cookie.

Role routing:

- Admin users are redirected to `/admin`.
- Employee users are redirected to `/dashboard`.

### Admin dashboard

The admin dashboard provides sales reporting and dashboard components:

- Total orders
- Revenue
- Average order value
- Sales trend chart
- Product/category mix chart
- Top orders table
- Top products table
- Top categories table

The report filter supports period, employee, and product filters.

### Product management

Products support:

- Name
- Category
- Price
- Unit of measure
- Tax
- Description

Categories can be selected or created from the product form. Category color is stored in the database and used across POS product cards and category tabs.

### Coupon and promotion management

The system supports two discount types.

#### Manual coupons

Coupon fields include:

- Name
- Code
- Discount type: percentage or fixed
- Discount value
- Minimum order amount
- Valid from / valid till
- Maximum usage
- Active status
- Description

#### Automated promotions

Promotion fields include:

- Name
- Target: order or product
- Discount type: percentage or fixed
- Discount value
- Minimum order amount for order-level promotions
- Product and minimum quantity for product-level promotions
- Valid from / valid till
- Active status
- Description

At checkout, the system compares manual coupon discount and best automatic promotion discount, then applies the better one.

### Floor plan and table management

The floor plan page lets admins design the cafe floor grid.

Table fields include:

- Label
- Row and column position
- Seats
- Width and depth
- Shape: round, square, or booth
- Active status
- Computed status: available, occupied, or reserved

The POS table selector uses this data to show available, occupied, and reserved tables. Active orders and today's bookings are displayed on table cards.

### Booking management

Admins can book tables from the Table Seats page.

Booking fields include:

- Table
- Customer
- Guest name
- Guest phone
- Guest count
- Date
- Start time
- End time
- Notes
- Active status

Bookings mark tables as reserved when no active order exists.

### User and employee management

Admins can manage staff accounts.

Supported actions:

- Add user
- Search users
- Sort users
- Change role
- Change password
- Archive or reactivate account

The account with `admin@cafe.com` is treated as a protected super admin account.

### POS terminal

The POS terminal is the main employee workflow.

Main POS sections:

- Customer bar
- Product grid
- Category filters
- Product search
- Cart sidebar
- Coupon input
- Automatic promotion summary
- Payment method selector
- Order confirmation modal
- Floor/table selector

Order confirmation is calculated server-side for subtotal, tax, discount, and total.

### Orders

Employees can view order history by employee. Paid and completed orders can open an invoice/receipt modal with:

- Order number
- Date and time
- Employee name
- Table or takeout indicator
- Payment method
- Customer details
- Items
- Subtotal
- Tax
- Discount
- Grand total
- Print action
- Email action

### Kitchen Display System

The KDS page displays active draft and paid orders for the current employee.

Kitchen actions:

- View order ticket
- View items and quantities
- Pay draft orders
- Complete paid orders
- Cancel paid orders
- Restore recently cancelled orders
- Decrement item quantity for paid orders

Completing or cancelling an order frees the assigned table unless there is another active order or booking on that table.

### Receipts and QR

Receipts can be printed through the browser print dialog.

Receipts can be emailed when the customer has an email address. The email route uses Nodemailer and an HTML invoice generator.

Receipt QR rendering is currently generated from a public QR image URL. A local QR generation route also exists at `POST /api/qr`.

### Voice ordering

The project includes a voice ordering flow:

- `/voice-assitant` page for recording audio
- `/api/voice/create-order` for speech-to-text and AI order extraction
- LiveKit voice room components for interactive voice sessions

Voice ordering depends on Deepgram, Groq, and LiveKit environment variables.

## Route map

### Public

| Route | Purpose |
|---|---|
| `/` | Redirects to `/login` |
| `/login` | Login page |
| `/register` | Currently redirects to `/login` |

### Admin

| Route | Purpose |
|---|---|
| `/admin` | Reports dashboard |
| `/admin/products` | Product management |
| `/admin/coupons` | Coupons and promotions |
| `/admin/tables` | Floor plan and bookings |
| `/admin/orders` | Active orders and admin KDS-style management |
| `/admin/users` | Staff management |
| `/admin/profile` | Admin profile |
| `/admin/settings` | Placeholder settings page |

### Employee

| Route | Purpose |
|---|---|
| `/dashboard` | Employee dashboard |
| `/pos` | POS terminal |
| `/kds` | Kitchen Display System |
| `/orders` | Employee order history and receipts |
| `/book-seat` | Table seats and bookings |
| `/profile` | Employee profile |
| `/voice-assitant` | Voice order entry |

## API overview

### Auth

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/register` | Register |
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/auth/logout` | Logout |

### Products and categories

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/products` | List products |
| `POST` | `/api/products` | Create product |
| `GET` | `/api/products/[id]` | Get product |
| `PATCH` | `/api/products/[id]` | Update product |
| `DELETE` | `/api/products/[id]` | Delete product |
| `GET` | `/api/categories` | List categories |
| `GET` | `/api/pos/products` | POS product and category list |
| `POST` | `/api/pos/products` | Create POS product with on-the-fly category |
| `PUT` | `/api/pos/products/[id]` | Update POS product |
| `DELETE` | `/api/pos/products/[id]` | Delete POS product |

### Users

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user |
| `PATCH` | `/api/users/[id]/role` | Change role |
| `PATCH` | `/api/users/[id]/password` | Change password |
| `PATCH` | `/api/users/[id]/status` | Archive or reactivate |

### Discounts

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/coupons` | List coupons |
| `POST` | `/api/admin/coupons` | Create coupon |
| `GET` | `/api/admin/coupons/[id]` | Get coupon |
| `PATCH` | `/api/admin/coupons/[id]` | Update coupon |
| `DELETE` | `/api/admin/coupons/[id]` | Delete coupon |
| `GET` | `/api/admin/promotions` | List promotions |
| `POST` | `/api/admin/promotions` | Create promotion |
| `PATCH` | `/api/admin/promotions/[id]` | Update promotion |
| `DELETE` | `/api/admin/promotions/[id]` | Delete promotion |
| `POST` | `/api/pos/coupon/apply` | Validate and preview coupon |
| `GET` | `/api/pos/promotions` | List active POS promotions |

### Orders and KDS

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/pos/orders` | Create order |
| `GET` | `/api/pos/orders/[id]` | Get order |
| `PATCH` | `/api/pos/orders/[id]` | Update order, payment, items, or status |
| `PATCH` | `/api/kds/orders/[id]/complete` | Complete order |
| `PATCH` | `/api/kds/orders/[id]/cancel` | Cancel order |
| `PATCH` | `/api/kds/orders/[id]/restore` | Restore cancelled order |
| `PATCH` | `/api/kds/order-items/[id]/decrement` | Decrement item quantity |

### Floor plan and bookings

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/floor-plan` | Load floor plan |
| `POST` | `/api/admin/floor-plan` | Save floor plan |
| `GET` | `/api/admin/floor-plan/booking` | List bookings |
| `POST` | `/api/admin/floor-plan/booking` | Create booking |
| `DELETE` | `/api/admin/floor-plan/booking?id=` | Cancel booking |
| `GET` | `/api/pos/floor` | Load POS floor status |
| `GET` | `/api/realtime/floor` | Stream floor updates with Server-Sent Events |
| `GET` | `/api/admin/table-history` | Load table visit history |

### Reports, QR, email, and voice

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/reports` | Load admin reports |
| `POST` | `/api/qr` | Generate QR data URL |
| `POST` | `/api/email/send-invoice` | Send invoice email |
| `POST` | `/api/voice/create-order` | Create order from voice/transcript |
| `POST` | `/api/livekit/token` | Generate LiveKit token |

## Database models

Core Prisma models:

- `User`
- `Customer`
- `Category`
- `Product`
- `Coupon`
- `Promotion`
- `Order`
- `OrderItem`
- `Floor`
- `Table`
- `Booking`

Important enums:

- `Role`: `ADMIN`, `EMPLOYEE`
- `OrderStatus`: `DRAFT`, `PAID`, `CANCELLED`, `COMPLETED`
- `TableStatus`: `AVAILABLE`, `OCCUPIED`, `RESERVED`
- `DiscountType`: `PERCENTAGE`, `FIXED`
- `PromotionTarget`: `ORDER`, `PRODUCT`
- `TableShape`: `round`, `square`, `booth`

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment variables

Create or update `.env` with the required variables. Do not commit secrets.

Required database variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

Required auth variable:

```env
JWT_SECRET="your-secret"
```

Optional but used by features:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

LIVEKIT_URL="wss://..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
NEXT_PUBLIC_LIVEKIT_URL="wss://..."

GROQ_API="..."
DEEPGRAM_API_KEY="..."

SMTP_HOST="..."
SMTP_PORT="465"
SMTP_USER="..."
SMTP_PASSWORD="..."
SMTP_FROM_NAME="Cafe POS"
```

### 3. Run Prisma migrations

```bash
npx prisma migrate dev
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Start development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build production app |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma generate` | Generate Prisma client |
| `npx prisma migrate dev` | Run development migrations |
| `npx prisma studio` | Open Prisma Studio |

## Folder structure

```text
app/
  (admin)/
    admin/              Admin pages
  (employee)/
    components/pos/     POS terminal components
    components/kds/     Kitchen Display components
    dashboard/          Employee dashboard
    pos/                POS terminal page
    kds/                Kitchen Display page
    orders/             Order history
    book-seat/          Floor plan and bookings
    voice-assitant/     Voice order page
  api/                  Route handlers
components/
  UserAvatar.tsx
  profile/
lib/
  auth/                 JWT/session/auth helpers
  validations/          Zod schemas
  realtime/             Floor SSE helper
services/
  auth.service.ts       Auth business logic
  product.service.ts    Product business logic
  discount.service.ts   Coupon/promotion calculations
  floorPlan.ts          Client floor plan service
prisma/
  schema.prisma         Database schema
  migrations/           SQL migrations
```

## Important implementation notes

- Public signup exists in the API, but the current register page redirects to login. New users are primarily created from the admin user management page.
- The problem statement describes POS session open/close, but the current schema and UI mainly use order statuses and table statuses instead of a dedicated active session workflow.
- Payment method selection is implemented in the POS UI, but card/UPI payment gateways are not integrated. UPI QR and receipt QR flows exist as UI/API helpers.
- The admin report page includes an export menu, but PDF/XLS file generation is not currently wired.
- Product deletion is blocked by database constraints when a product is already used in orders.
- The floor realtime endpoint exists, but the POS floor selector currently refreshes manually.
- Voice ordering requires working Deepgram, Groq, and LiveKit configuration.

## Security notes

- Keep `.env` out of version control.
- Rotate any exposed local or development credentials before deploying.
- Use strong `JWT_SECRET` values.
- Use HTTPS and secure cookies in production.
- Do not commit uploaded avatars or private customer data.
