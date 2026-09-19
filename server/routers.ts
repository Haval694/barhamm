import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import {
  createCategory,
  deleteProduct,
  getProductById,
  insertProduct,
  listCategories,
  listProducts,
  updateProduct,
  upsertUser,
} from "./db";

const productInput = z.object({
  name: z.string().min(1).max(255),
  price: z.number().int().nonnegative(),
  notes: z.string().max(20000),
  sku: z.string().min(1).max(128),
  categoryId: z.number().int().positive(),
  categoryIds: z.array(z.number().int().positive()).min(1),
  stockStatus: z.enum(["in_stock", "out_of_stock"]),
  imageUrl: z.string().max(2000).nullable().optional(),
  imageKey: z.string().max(1000).nullable().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  categories: router({
    list: protectedProcedure.query(() => listCategories()),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120) })).mutation(async ({ input }) => {
      try {
        return await createCategory({ name: input.name });
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "ئەم بەشە پێشتر هەیە" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "نەتوانرا بەشەکە زیاد بکرێت" });
      }
    }),
  }),
  products: router({
    list: protectedProcedure.input(z.object({
      query: z.string().optional(),
      categoryId: z.number().int().positive().optional(),
      stockStatus: z.enum(["in_stock", "out_of_stock"]).optional(),
      sort: z.enum(["recent", "name", "price", "stock"]).optional(),
    }).optional()).query(({ input }) => listProducts(input ?? {})),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getProductById(input.id)),
    create: protectedProcedure.input(productInput).mutation(async ({ input }) => {
      try {
        return await insertProduct({ ...input, categoryIds: JSON.stringify(input.categoryIds) });
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "ئەم SKU ـیە پێشتر بەکارهاتووە" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "بەرهەمەکە پاشەکەوت نەکرا" });
      }
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: productInput.partial() })).mutation(async ({ input }) => {
      try {
        const updateData = input.data.categoryIds ? { ...input.data, categoryIds: JSON.stringify(input.data.categoryIds) } : input.data;
        return await updateProduct(input.id, updateData as any);
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "ئەم SKU ـیە پێشتر بەکارهاتووە" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "گۆڕانکارییەکان پاشەکەوت نەکران" });
      }
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteProduct(input.id)),
  }),
  media: router({
    uploadImage: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.string().regex(/^image\//),
      dataUrl: z.string().startsWith("data:image/").max(30_000_000),
    })).mutation(async ({ ctx, input }) => {
      const encoded = input.dataUrl.split(",")[1];
      if (!encoded) throw new TRPCError({ code: "BAD_REQUEST", message: "وێنەکە دروست نییە" });
      const buffer = Buffer.from(encoded, "base64");
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const result = await storagePut(`${ctx.user.id}/products/${Date.now()}-${safeName}`, buffer, input.mimeType);
      return result;
    }),
  }),
});

export type AppRouter = typeof appRouter;
