import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helper: random pick ───────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log("🌱 Starting seed...\n");

  // ─── 1. Clean existing data (in correct order due to FK) ─────
  console.log("🧹 Cleaning old data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // ─── 2. Create Admin ─────────────────────────────────────────
  console.log("👨‍💼 Creating admin...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@cafe.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`   ✅ Admin: ${admin.email} / admin123`);

  // ─── 3. Create Employees ─────────────────────────────────────
  console.log("👨‍🍳 Creating employees...");
  const employeePassword = await bcrypt.hash("employee123", 10);
  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: "John Cashier",
        email: "john@cafe.com",
        password: employeePassword,
        role: "EMPLOYEE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Sarah Cashier",
        email: "sarah@cafe.com",
        password: employeePassword,
        role: "EMPLOYEE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Mike Cashier",
        email: "mike@cafe.com",
        password: employeePassword,
        role: "EMPLOYEE",
      },
    }),
  ]);
  console.log(`   ✅ ${employees.length} employees (password: employee123)`);

  // ─── 4. Create Customers ─────────────────────────────────────
  console.log("👥 Creating customers...");
  const customerNames = [
    "Rahul Sharma", "Priya Patel", "Amit Kumar", "Neha Singh",
    "Vikram Reddy", "Anjali Gupta", "Rohan Mehta", "Sneha Iyer",
    "Karthik Rao", "Pooja Nair", "Arjun Joshi", "Divya Menon",
    "Sanjay Verma", "Kavita Desai", "Manish Agarwal",
  ];
  const customers = await Promise.all(
    customerNames.map((name, i) =>
      prisma.customer.create({
        data: {
          name,
          email: `customer${i + 1}@example.com`,
          phone: `9${randInt(100000000, 999999999)}`,
        },
      })
    )
  );
  console.log(`   ✅ ${customers.length} customers`);

  // ─── 5. Create Categories ────────────────────────────────────
  console.log("📂 Creating categories...");
  const categoriesData = [
    { name: "Coffee", color: "#92400e" },
    { name: "Tea", color: "#16a34a" },
    { name: "Pastries", color: "#f59e0b" },
    { name: "Sandwiches", color: "#dc2626" },
    { name: "Desserts", color: "#a855f7" },
    { name: "Beverages", color: "#0891b2" },
  ];
  const categories = await Promise.all(
    categoriesData.map((c) => prisma.category.create({ data: c }))
  );
  console.log(`   ✅ ${categories.length} categories`);

  // ─── 6. Create Products ──────────────────────────────────────
  console.log("🍽️ Creating products...");
  const productsByCategory: Record<string, { name: string; price: number }[]> = {
    Coffee: [
      { name: "Espresso", price: 80 },
      { name: "Cappuccino", price: 120 },
      { name: "Latte", price: 140 },
      { name: "Americano", price: 100 },
      { name: "Mocha", price: 160 },
    ],
    Tea: [
      { name: "Masala Chai", price: 50 },
      { name: "Green Tea", price: 70 },
      { name: "Earl Grey", price: 90 },
      { name: "Lemon Tea", price: 60 },
    ],
    Pastries: [
      { name: "Croissant", price: 110 },
      { name: "Blueberry Muffin", price: 130 },
      { name: "Chocolate Donut", price: 90 },
      { name: "Cinnamon Roll", price: 150 },
    ],
    Sandwiches: [
      { name: "Veg Club Sandwich", price: 180 },
      { name: "Chicken Sandwich", price: 220 },
      { name: "Grilled Cheese", price: 150 },
      { name: "Paneer Tikka Sandwich", price: 200 },
    ],
    Desserts: [
      { name: "Chocolate Cake Slice", price: 180 },
      { name: "Cheesecake", price: 220 },
      { name: "Tiramisu", price: 250 },
      { name: "Brownie", price: 140 },
    ],
    Beverages: [
      { name: "Fresh Orange Juice", price: 120 },
      { name: "Cold Coffee", price: 150 },
      { name: "Mango Smoothie", price: 180 },
      { name: "Iced Tea", price: 100 },
    ],
  };

  const allProducts: any[] = [];
  for (const category of categories) {
    const items = productsByCategory[category.name] || [];
    for (const item of items) {
      const product = await prisma.product.create({
        data: {
          name: item.name,
          price: item.price,
          unit: "piece",
          tax: 5,
          categoryId: category.id,
          description: `Delicious ${item.name.toLowerCase()}`,
        },
      });
      allProducts.push(product);
    }
  }
  console.log(`   ✅ ${allProducts.length} products`);

  // ─── 7. Create 60 Orders ─────────────────────────────────────
  console.log("📦 Creating 60 orders...");
  const statuses: ("PAID" | "DRAFT" | "CANCELLED")[] = [
    "PAID", "PAID", "PAID", "PAID", "PAID", "PAID", "PAID", // 70% paid
    "DRAFT", "DRAFT",                                       // 20% draft
    "CANCELLED",                                            // 10% cancelled
  ];
  const paymentMethods = ["cash", "card", "upi"];

  for (let i = 1; i <= 60; i++) {
    const orderNumber = `ORD-${String(i).padStart(4, "0")}`;
    const employee = pick(employees);
    const customer = Math.random() > 0.3 ? pick(customers) : null; // 70% have customer
    const status = pick(statuses);

    // Random 1–5 items per order
    const itemCount = randInt(1, 5);
    const selectedProducts = new Set<string>();
    const orderItems: any[] = [];
    let subtotal = 0;
    let taxAmount = 0;

    for (let j = 0; j < itemCount; j++) {
      let product = pick(allProducts);
      // Avoid duplicates in same order
      while (selectedProducts.has(product.id) && selectedProducts.size < allProducts.length) {
        product = pick(allProducts);
      }
      selectedProducts.add(product.id);

      const qty = randInt(1, 3);
      const lineTotal = product.price * qty;
      const lineTax = (lineTotal * product.tax) / 100;

      subtotal += lineTotal;
      taxAmount += lineTax;

      orderItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice: product.price,
        lineTotal,
      });
    }

    // Random discount (0, 10, 20, 50)
    const discount = pick([0, 0, 0, 10, 20, 50]);
    const total = Math.max(0, subtotal + taxAmount - discount);

    // Random date in last 30 days
    const daysAgo = randInt(0, 30);
    const hoursAgo = randInt(0, 23);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(createdAt.getHours() - hoursAgo);

    await prisma.order.create({
      data: {
        orderNumber,
        employeeId: employee.id,
        customerId: customer?.id || null,
        subtotal,
        taxAmount,
        discount,
        total,
        status,
        paymentMethod: status === "PAID" ? pick(paymentMethods) : null,
        createdAt,
        items: { create: orderItems },
      },
    });
  }
  console.log(`   ✅ 60 orders created`);

  // ─── Summary ─────────────────────────────────────────────────
  console.log("\n📊 Seed Summary:");
  console.log(`   Users:      ${1 + employees.length} (1 admin + ${employees.length} employees)`);
  console.log(`   Customers:  ${customers.length}`);
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Products:   ${allProducts.length}`);
  console.log(`   Orders:     60`);
  console.log("\n🔑 Login Credentials:");
  console.log("   Admin:    admin@cafe.com    / admin123");
  console.log("   Employee: john@cafe.com     / employee123");
  console.log("   Employee: sarah@cafe.com    / employee123");
  console.log("   Employee: mike@cafe.com     / employee123");
  console.log("\n✅ Seed complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());