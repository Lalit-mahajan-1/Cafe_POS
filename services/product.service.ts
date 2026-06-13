import { prisma } from "@/lib/prisma";
import { CreateProductInput, UpdateProductInput } from "@/lib/validations/product";

export const productService = {
  /**
   * Get all products with category info
   */
  async getAll() {
    return prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });
  },

  /**
   * Get single product by ID
   */
  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });
    if (!product) throw new Error("Product not found");
    return product;
  },

  /**
   * Create new product
   */
  async create(data: CreateProductInput) {
    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) throw new Error("Category not found");

    return prisma.product.create({
      data,
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });
  },

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductInput) {
    // Verify product exists
    await this.getById(id);

    // If categoryId is being updated, verify new category exists
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) throw new Error("Category not found");
    }

    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });
  },

  /**
   * Delete product
   * ⚠️ Will fail if product is used in orders (foreign key constraint)
   */
  async delete(id: string) {
    await this.getById(id);

    // Check if product is used in any orders
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItemCount > 0) {
      throw new Error(
        `Cannot delete: product is used in ${orderItemCount} order(s). Consider archiving instead.`
      );
    }

    return prisma.product.delete({ where: { id } });
  },
};