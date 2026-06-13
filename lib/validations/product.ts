import { z } from "zod";

const baseProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  price: z.number().positive("Price must be positive"),
  unit: z.string().default("piece"),
  tax: z.number().min(0).max(100).default(0),
  description: z.string().max(500).optional(),
  categoryId: z.string().optional(),
  newCategoryName: z.string().min(1, "Category name is required").optional(),
});

export const createProductSchema = baseProductSchema.refine(data => data.categoryId || data.newCategoryName, {
  message: "Either Category ID or New Category Name must be provided",
  path: ["categoryId"],
});

export const updateProductSchema = baseProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;