import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { categories, InsertCategory, InsertProduct, InsertUser, products, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(categories).values(data);
  const id = Number((result as any)[0]?.insertId);
  const created = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return created[0];
}

export async function listProducts(filters: {
  query?: string;
  categoryId?: number;
  stockStatus?: "in_stock" | "out_of_stock";
  sort?: "recent" | "name" | "price" | "stock";
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.query?.trim()) {
    const q = `%${filters.query.trim()}%`;
    conditions.push(or(like(products.name, q), like(products.sku, q), like(products.notes, q)));
  }
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.stockStatus) conditions.push(eq(products.stockStatus, filters.stockStatus));

  const selection = {
    id: products.id,
    name: products.name,
    price: products.price,
    notes: products.notes,
    sku: products.sku,
    categoryId: products.categoryId,
    categoryIds: products.categoryIds,
    stockStatus: products.stockStatus,
    imageUrl: products.imageUrl,
    imageKey: products.imageKey,
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
    categoryName: categories.name,
  };
  let query: any = db.select(selection).from(products).leftJoin(categories, eq(products.categoryId, categories.id));
  if (conditions.length) query = query.where(and(...conditions));
  if (filters.sort === "name") query = query.orderBy(asc(products.name));
  else if (filters.sort === "price") query = query.orderBy(asc(products.price));
  else if (filters.sort === "stock") query = query.orderBy(desc(products.stockStatus), asc(products.name));
  else query = query.orderBy(desc(products.createdAt));
  return query;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: products.id,
    name: products.name,
    price: products.price,
    notes: products.notes,
    sku: products.sku,
    categoryId: products.categoryId,
    categoryIds: products.categoryIds,
    stockStatus: products.stockStatus,
    imageUrl: products.imageUrl,
    imageKey: products.imageKey,
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
    categoryName: categories.name,
  }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function insertProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(products).values(data);
  return getProductById(Number((result as any)[0]?.insertId));
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(products).set(data).where(eq(products.id, id));
  return getProductById(id);
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(products).where(eq(products.id, id));
  return { success: true } as const;
}
