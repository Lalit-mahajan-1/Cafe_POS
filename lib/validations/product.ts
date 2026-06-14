import { z } from "zod";

const productBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  price: z.number().positive("Price must be positive"),
  unit: z.string().default("piece"),
  tax: z.number().min(0).max(100).default(0),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  categoryId: z.string().optional(),
  newCategoryName: z.string().max(100).optional(),
});

// Create requires either categoryId or newCategoryName
export const createProductSchema = productBaseSchema.refine(
  (data) => !!data.categoryId?.trim() || !!data.newCategoryName?.trim(),
  {
    message: "Either select a category or provide a new category name",
    path: ["categoryId"],
  }
);

// Update has all fields optional — no category refinement needed
export const updateProductSchema = productBaseSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;