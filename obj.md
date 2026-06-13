# Odoo Cafe POS — Project Context

## Overview
A complete web-based Restaurant Point-of-Sale (POS) system with three parts:
1. **Backend** — Admin configures products, employees, tables, payment methods, promotions, and views reports.
2. **POS Terminal** — Employees take orders, manage tables/customers, process payments, send orders to kitchen.
3. **Kitchen Display (KDS)** — Separate real-time screen showing incoming orders and their preparation status.

## Roles
- **User (Admin)** — Logs into backend to configure and manage the system.
- **Employee (Cashier)** — Operates POS terminal: orders, payments, customers, tables.
- **Customer** — Visited and managed within the POS terminal by the employee (not a system login).

## High-Level Application Flow
1. User signs up or logs in → on success, POS session opens directly.
2. Employee sees Floor pop-up → selects table → goes to Order View.
3. Employee adds products, adjusts quantities, applies discounts/coupons → sends order to Kitchen Display.
4. Kitchen staff moves order through stages: To Cook → Preparing → Completed.
5. Employee processes payment (Cash, Card/Digital, UPI QR) → receipt printed or emailed.
6. At shift end, session is closed → user reviews reports.

---

## 2. Backend Features

### 2.1 Login & Signup
- **Signup**: Name, Email, Password.
- **Login**: Email, Password.
- On successful login, POS session opens directly.

### 2.2 Product Management
- Full CRUD (create, list, update, delete).
- **Fields**: Name, Category, Price, Unit of Measure (per piece/kg/litre), Tax, Description.
- Category field allows selecting an existing category OR creating a new one inline without leaving the product form.

### 2.3 Product Category Management
- Full CRUD.
- **Fields**: Name, Color.
- The category color must propagate everywhere the category is used: product cards in POS terminal, category filter tabs, order view. Updating color in backend updates it everywhere automatically (single source of truth, no duplication).

### 2.4 Payment Method Setup
- Enable/disable each method via toggle.
- **Methods**:
  - Cash — available at checkout when enabled.
  - Digital/Card — card and bank payments.
  - UPI QR — requires a saved UPI ID (e.g. `cafe@ybl`); system dynamically generates a QR code from it at the payment screen.

### 2.5 Floor Plan & Table Management
- User creates floors, adds tables under each floor.
- **Table Fields**: Table Number, Number of Seats, Active Status.
- These tables appear in the Floor pop-up inside the POS terminal.

### 2.6 Coupons & Promotions
Two discount types:

**Coupon Codes**
- Created with a code + discount type (percentage or fixed amount off whole order).
- Employee manually enters the code in POS to redeem.

**Automated Promotions** (no code entry, trigger automatically)
- **Product-level**: set a Minimum Quantity; discount fires when employee reaches that quantity for the product.
- **Order-level**: set a Minimum Order Amount; discount fires when cart total crosses that amount.
- In both cases, discount is percentage or fixed amount, and applies to the whole order.

### 2.7 User / Employee Management
- List all accounts, add new ones.
- **Fields**: Name, Email, Role (User/Admin or Employee/Cashier).
- **Actions per record**: Change Password, Archive, Delete.
- Archive deactivates the account without deleting it.

### 2.8 POS Terminal & Session
- Backend shows last open session date and last closing sale amount.
- "Open Session" button launches the terminal.
- On session close (end of shift), a closing summary is displayed.

### 2.9 Reporting & Dashboard
- Real-time sales insights; all stats/charts/tables auto-update when a filter changes.
- **Filters**: Period (Today, This Week, This Month, custom range), Employee, Session, Product.
- **Summary Metrics**: Total Orders, Revenue, Average Order Value.
- **Dashboard Components**:
  - Sales Trend Chart (revenue or order count over time)
  - Top Categories Chart (sales distribution by category)
  - Top Orders Table (highest-value orders)
  - Top Products Table (product name, quantity sold, revenue)
  - Top Categories Table (category-wise revenue)
- Reports exportable as **PDF or XLS**.

### Backend Navigation
Products, Category, Payment Method, Coupon & Promotion, Booking, User/Employee, KDS, Reports, Log-Out.

---

## 3. POS Terminal — Views

The POS Terminal opens directly after login; used by employee to manage orders, customers, payments, tables.

### 3.1 Navigation (Top Bar)
- **POS Order** — main order-taking screen.
- **Orders** — list of all orders for current session.
- **Customer** — customer management.
- **Table View** — floor and table selection screen.
- **Product Search Bar** — search products by name.
- **Current Table Indicator**.
- **Employee Icon** — shows logged-in employee.
- **Hamburger Menu** — dropdown: Products, Category, Payment Method, Coupon & Promotion, Booking, User/Employee, KDS, Reports, Log-Out.

### 3.2 Floor Pop-up
- Appears at session start or when employee taps Table View.
- Shows all floors with tables as a numbered grid of clickable cards.
- Each card shows table number and number of seats.
- Tables with active orders are visually distinct from available ones.
- Selecting a table → opens Order View for that table.

### 3.3 Order View
Primary screen, divided into three sections: **Product**, **Cart**, **Payment**.

**Product Section**
- Products shown as cards.
- Category tabs filter products by category.
- Search by product name.
- Clicking a product adds it to the cart.

**Cart Section**
- Each item shows: Product Name, Quantity, Unit Price, Line Total.
- Quantity adjustable directly from cart.
- Product-level promotion discount shown on the corresponding product line.
- Order-level discount/coupon appears as a separate line in order summary.
- **Send to Kitchen** action sends the current order to Kitchen Display.

**Order Summary**
- Subtotal, Tax, Discounts, Total.

**Actions**
- **Customer** — assign a customer to current order.
- **Discount** — open coupon code popup.
- **Send** — open receipt email popup.

**Payment Section**
- Shows all payment methods enabled in backend.
- Employee selects a method and completes the transaction.

### 3.4 Discount Popup
- Employee enters coupon code; if valid, discount applied and reflected in order summary.
- Automated promotions apply automatically and do not use this popup.

### 3.5 Payment & Receipt
- **Cash** — employee enters amount received; system shows change due.
- **UPI** — QR code generated from saved UPI ID, shown with total amount; employee clicks Confirmed (paid) or Cancel (back).
- **Card** — employee enters a transaction reference.
- After successful payment, order is marked as **paid**.
- Employee can: Print receipt, or Send receipt to customer via email.

### 3.6 Orders
- Shows all orders created during current session.
- Search bar filters by customer name, order number, or date.
- **Each order shows**: Order Number, Date, Customer, Amount, Status (Draft / Paid / Cancelled).
- Clicking an order → Order Detail view: Order Number, Date, Customer, Amount, Status, Products.
- **Draft orders**: Delete and Edit Order buttons visible. Edit Order → reloads the cart with that order for editing.
- **Paid orders**: view-only.

### 3.7 Table View
- Shows all tables across all floors.
- Tables with active orders visually distinct from available ones.
- Selecting a table → opens corresponding order.

### 3.8 Customer Management
- Employee can search existing customers or create new ones from POS terminal.
- **Fields**: Name, Email, Phone Number.
- **Actions**: Create, Edit, Delete.
- Once selected, customer is linked to the current order; their email is used for receipt delivery.

---

## 4. Kitchen Display (KDS)
- Accessed via a fixed system URL; opened on a separate device/browser tab by kitchen staff.
- Receives orders in **real time** when employee clicks Send to Kitchen.
- **Each order ticket card shows**: Order Number (= ticket number), Ordered Items, Quantities.
- Only products assigned to the Kitchen Display appear here.
- **Order Stages**: To Cook → Preparing → Completed.
- Clicking a ticket card moves the **entire order** to the next stage.
- Clicking an **individual item** within a ticket marks only that item as completed (with strikethrough), enabling item-by-item progress tracking.
- Provides a search bar and filters by product and category.

---

## 5. Key Data Relationships (for schema design)
- **Product** → belongs to one **Category** (Category has Name + Color, color reflects across UI).
- **Product** → has Tax, Unit of Measure, Price, Description.
- **Floor** → has many **Tables** (Table Number, Seats, Active Status).
- **Order** → belongs to a Table (optional), a Customer (optional), an Employee, and a Session; has many Order Lines (Product, Quantity, Unit Price, Line Total, applied discounts).
- **Order** → has Status: Draft, Paid, Cancelled; has Subtotal, Tax, Discounts, Total.
- **Coupon** → Code, Discount Type (percentage/fixed), applies to whole order.
- **Promotion** → Type (Product-level with Min Quantity, or Order-level with Min Order Amount), Discount Type (percentage/fixed), applies to whole order.
- **PaymentMethod** → Cash / Digital-Card / UPI QR (UPI requires UPI ID), each can be enabled/disabled.
- **User/Employee** → Name, Email, Role (Admin/Employee), Password, Active/Archived status.
- **Customer** → Name, Email, Phone Number; linked to Orders.
- **Session** → tracks open/close date, closing sale amount, and aggregates Orders for reporting.
- **KitchenOrder/Ticket** → linked to Order, tracks per-item completion status and overall stage (To Cook/Preparing/Completed); only includes products flagged for KDS.

---

## 6. Tech Considerations / Learning Goals
- Full-stack web app with REST APIs.
- Authentication and role-based access control (Admin vs Employee).
- Relational database design with the relationships above.
- Real-time updates between POS terminal and Kitchen Display (e.g., WebSockets/sockets).
- Payment processing flow (Cash, Card, UPI QR) and receipt generation (print + email).
- Reporting/analytics dashboards with filters, charts, and PDF/XLS export.

## Reference
- Mockup: https://link.excalidraw.com/l/65VNwvy7c4X/1Vvr9oy6B3F