import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Clipboard,
  CloudOff,
  Download,
  Edit3,
  FolderPlus,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { toast } from "sonner";

type Screen = "home" | "products" | "search" | "settings";
type StockStatus = "in_stock" | "out_of_stock";
type Product = {
  id: number;
  name: string;
  price: number;
  notes: string;
  sku: string;
  categoryId: number;
  categoryIds?: number[] | string | null;
  stockStatus: StockStatus;
  imageUrl?: string | null;
  imageKey?: string | null;
  categoryName?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
type Category = { id: number; name: string; createdAt?: string | Date };
type FormState = {
  name: string;
  price: string;
  notes: string;
  sku: string;
  categoryIds: string[];
  stockStatus: StockStatus;
  imageUrl: string | null;
  imageKey: string | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  notes: "",
  sku: "",
  categoryIds: [],
  stockStatus: "in_stock",
  imageUrl: null,
  imageKey: null,
};

const navItems: Array<{ id: Screen; label: string; icon: typeof LayoutDashboard }> = [
  { id: "home", label: "سەرەکی", icon: LayoutDashboard },
  { id: "products", label: "بەرهەمەکان", icon: Package },
  { id: "search", label: "گەڕان", icon: Search },
  { id: "settings", label: "ڕێکخستن", icon: Settings },
];

function formatPrice(price: number) {
  return `${price.toLocaleString("en-US")} د.ع`;
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}

function selectedCategoryIds(product: Partial<Product>) {
  if (Array.isArray(product.categoryIds)) return product.categoryIds;
  if (typeof product.categoryIds === "string") { try { return JSON.parse(product.categoryIds) as number[]; } catch {} }
  return product.categoryId ? [product.categoryId] : [];
}

function ProductImage({ product, large = false }: { product: Partial<Product>; large?: boolean }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={product.name || "بەرهەم"} className={`h-full w-full object-cover ${large ? "rounded-[28px]" : "rounded-2xl"}`} />;
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f4e8e9] via-[#f9f2eb] to-[#e7d7dc] text-[#b46783] ${large ? "rounded-[28px]" : "rounded-2xl"}`}>
      <Sparkles className={large ? "h-14 w-14" : "h-8 w-8"} strokeWidth={1.5} />
    </div>
  );
}

function StockBadge({ status }: { status: StockStatus }) {
  const inStock = status === "in_stock";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${inStock ? "bg-[#e6f4ed] text-[#24754c] dark:bg-[#183b2a] dark:text-[#a8e5bf]" : "bg-[#fbe8e8] text-[#ab4e52] dark:bg-[#432329] dark:text-[#ffb6b6]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-[#38a169]" : "bg-[#d76567]"}`} />
      {inStock ? "بەردەستە" : "نەماوە"}
    </span>
  );
}

function EmptyState({ search, onAdd }: { search?: boolean; onAdd: () => void }) {
  return (
    <div className="soft-enter flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[#ddcfc4] bg-white/60 px-6 py-16 text-center dark:border-[#403642] dark:bg-[#201c25]">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f5e6ea] text-[#b46783] dark:bg-[#3c2630]"><Package className="h-8 w-8" /></div>
      <h3 className="text-lg font-bold text-[#332d35] dark:text-[#f8f0f5]">{search ? "هیچ ئەنجامێک نەدۆزرایەوە" : "هێشتا هیچ بەرهەمێک نییە"}</h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-[#82767c] dark:text-[#b8abb4]">{search ? "وشەی گەڕان یان فلتەرەکان بگۆڕە و دووبارە هەوڵ بدە." : "یەکەم بەرهەمەکەت زیاد بکە بۆ ئەوەی لەگەڵ تیمەکەتدا بەڕێوەی ببەیت."}</p>
      {!search && <button onClick={onAdd} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#b46783] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#b46783]/20 transition hover:bg-[#9f5874] active:scale-[.97]"><Plus className="h-4 w-4" /> زیادکردنی بەرهەم</button>}
    </div>
  );
}

function ProductCard({ product, onOpen, onEdit, onDelete, onDownload }: { product: Product; onOpen: () => void; onEdit: () => void; onDelete: () => void; onDownload: () => void }) {
  return (
    <article className="group overflow-hidden rounded-[24px] border border-[#eee5df] bg-white shadow-[0_8px_30px_rgba(66,46,50,.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(66,46,50,.1)] dark:border-[#322b37] dark:bg-[#201c25]">
      <button onClick={onOpen} className="block w-full text-right">
        <div className="relative aspect-[1.15] overflow-hidden bg-[#f6f0ed] dark:bg-[#2b2530]"><ProductImage product={product} /><span className="absolute right-3 top-3"><StockBadge status={product.stockStatus} /></span></div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 min-h-[48px] text-[15px] font-bold leading-6 text-[#332d35] dark:text-[#f8f0f5]">{product.name}</h3><span className="shrink-0 rounded-xl bg-[#faf3ee] px-2 py-1 text-xs font-bold text-[#a56b60] dark:bg-[#332930] dark:text-[#e0aaa0]">{product.categoryName || "بەش"}</span></div>
          <div className="mt-3 flex items-center justify-between"><span className="text-lg font-extrabold tracking-tight text-[#b46783]">{formatPrice(product.price)}</span><span className="max-w-[100px] truncate text-[11px] font-medium text-[#9a8d91]">{product.sku}</span></div>
        </div>
      </button>
      <div className="flex items-center gap-2 border-t border-[#f1e9e4] px-4 py-3 dark:border-[#322b37]">
        <button title="بینین" onClick={onOpen} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#fbf7f4] py-2.5 text-xs font-bold text-[#5f5159] transition hover:bg-[#f5e8eb] dark:bg-[#2a242e] dark:text-[#d8cbd3] dark:hover:bg-[#392b34]"><MoreHorizontal className="h-4 w-4" /> بینین</button>
        <button title="دەستکاری" onClick={onEdit} className="rounded-xl p-2.5 text-[#9c7b87] transition hover:bg-[#f7ebee] hover:text-[#b46783] dark:hover:bg-[#392b34]"><Edit3 className="h-4 w-4" /></button>
        <button title="داگرتنی وێنە" onClick={onDownload} disabled={!product.imageUrl} className="rounded-xl p-2.5 text-[#9c7b87] transition hover:bg-[#f7ebee] hover:text-[#b46783] disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-[#392b34]"><Download className="h-4 w-4" /></button>
        <button title="سڕینەوە" onClick={onDelete} className="rounded-xl p-2.5 text-[#bd7779] transition hover:bg-[#fbe9e9] dark:hover:bg-[#432329]"><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Package; tone: "rose" | "green" | "red" | "sand" }) {
  const tones = { rose: "bg-[#f8e9ed] text-[#b46783] dark:bg-[#3c2630]", green: "bg-[#e6f4ed] text-[#398564] dark:bg-[#183b2a]", red: "bg-[#fbe8e8] text-[#ba6669] dark:bg-[#432329]", sand: "bg-[#f7efe5] text-[#aa7b53] dark:bg-[#3c3023]" };
  return <div className="rounded-[24px] border border-[#eee5df] bg-white p-4 shadow-[0_8px_30px_rgba(66,46,50,.04)] dark:border-[#322b37] dark:bg-[#201c25]"><div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div><p className="text-2xl font-extrabold text-[#332d35] dark:text-[#f8f0f5]">{value.toLocaleString("en-US")}</p><p className="mt-1 text-xs font-semibold text-[#8d7e85] dark:text-[#b8abb4]">{label}</p></div>;
}

function ProductForm({ initial, categories, editing, saving, uploading, onSave, onCancel, onImageUpload }: { initial: FormState; categories: Category[]; editing: boolean; saving: boolean; uploading: boolean; onSave: (form: FormState) => void; onCancel: () => void; onImageUpload: (file: File, setForm: Dispatch<SetStateAction<FormState>>) => void }) {
  const [form, setForm] = useState<FormState>(initial);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#fbf9f7]/95 px-4 py-5 backdrop-blur-sm dark:bg-[#15131a]/95 sm:py-10">
      <div className="mx-auto max-w-2xl rounded-[30px] border border-[#eee5df] bg-white shadow-2xl dark:border-[#3a303d] dark:bg-[#201c25]">
        <div className="flex items-center justify-between border-b border-[#f1e9e4] px-5 py-4 dark:border-[#342c37] sm:px-7"><div><p className="text-xs font-bold tracking-widest text-[#b46783]">{editing ? "گۆڕانکاری" : "بەرهەمی نوێ"}</p><h2 className="mt-1 text-xl font-extrabold text-[#332d35] dark:text-[#f8f0f5]">{editing ? "دەستکاری بەرهەم" : "زیادکردنی بەرهەم"}</h2></div><button onClick={onCancel} className="rounded-xl p-2 text-[#9a8d91] hover:bg-[#f7efef] dark:hover:bg-[#332b36]"><X className="h-5 w-5" /></button></div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <div><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) onImageUpload(file, setForm); }} /><button type="button" onClick={() => fileRef.current?.click()} className="relative aspect-square w-full overflow-hidden rounded-[26px] border-2 border-dashed border-[#dec8cf] bg-[#fbf3f5] text-center transition hover:border-[#b46783] dark:border-[#55404a] dark:bg-[#2d232a]">{form.imageUrl ? <img src={form.imageUrl} alt="پێشبینینی وێنە" className="h-full w-full object-cover" /> : <span className="flex h-full flex-col items-center justify-center gap-2 text-[#b46783]"><ImagePlus className="h-8 w-8" /><span className="text-xs font-bold">وێنە هەڵبژێرە</span></span>}{uploading && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white"><RefreshCw className="h-6 w-6 animate-spin" /></span>}</button><p className="mt-2 text-center text-[11px] leading-5 text-[#94868d]">وێنەکە لە هەموو بەکارهێنەراندا هاوبەش دەبێت</p></div>
            <div className="space-y-4"><Field label="ناوی بەرهەم" required><input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="ناوی بەرهەم بنووسە" className="input" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="نرخ" required><input dir="ltr" inputMode="numeric" value={form.price} onChange={e => set("price", formatPriceInput(e.target.value))} required placeholder="8,000" className="input text-right" /></Field><Field label="ID" required><input dir="ltr" value={form.sku} onChange={e => set("sku", e.target.value)} required placeholder="ID بنووسە" className="input text-right" /></Field></div><Field label="تاگ / بەش" required><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map(category => { const active = form.categoryIds.includes(String(category.id)); return <button key={category.id} type="button" onClick={() => set("categoryIds", active ? form.categoryIds.filter(id => id !== String(category.id)) : [...form.categoryIds, String(category.id)])} className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${active ? "border-[#b46783] bg-[#f5e6ea] text-[#b46783] dark:bg-[#3c2630] dark:text-[#f0b8c7]" : "border-[#eee5df] text-[#8b7c83] dark:border-[#3b323d]"}`}>{active ? "✓ " : ""}{category.name}</button>; })}</div><p className="mt-2 text-[11px] text-[#96888f]">دەتوانیت زیاتر لە یەک بەش هەڵبژێریت.</p></Field></div>
          </div>
          <Field label="بەکارهێنان / تێبینی"><textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="چۆن بەکاردێت؟ تێبینییەکان لێرە بنووسە..." rows={5} className="input resize-none leading-7" /></Field>
          <div><p className="mb-2 text-sm font-bold text-[#51454c] dark:text-[#e2d5dd]">دۆخی ستۆک</p><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => set("stockStatus", "in_stock")} className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${form.stockStatus === "in_stock" ? "border-[#88c9a6] bg-[#edf9f1] text-[#26784c] dark:border-[#397e59] dark:bg-[#193728] dark:text-[#a8e5bf]" : "border-[#eee5df] text-[#8b7c83] dark:border-[#3b323d]"}`}><span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#43a968]" />بەردەستە</button><button type="button" onClick={() => set("stockStatus", "out_of_stock")} className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${form.stockStatus === "out_of_stock" ? "border-[#e3a4a6] bg-[#fff1f1] text-[#a84e51] dark:border-[#85444b] dark:bg-[#432329] dark:text-[#ffb6b6]" : "border-[#eee5df] text-[#8b7c83] dark:border-[#3b323d]"}`}><span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#d76567]" />نەماوە</button></div></div>
          <div className="flex flex-col-reverse gap-3 border-t border-[#f1e9e4] pt-5 dark:border-[#342c37] sm:flex-row sm:justify-start"><button type="button" onClick={onCancel} className="rounded-2xl border border-[#e6dcd7] px-5 py-3 text-sm font-bold text-[#6e6068] transition hover:bg-[#faf6f3] dark:border-[#413642] dark:text-[#cabbc5] dark:hover:bg-[#2a242e]">پاشگەزبوونەوە</button><button disabled={saving || uploading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b46783] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#b46783]/20 transition hover:bg-[#9f5874] disabled:cursor-wait disabled:opacity-60">{saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editing ? "پاشەکەوتکردنی گۆڕانکاری" : "پاشەکەوتکردن"}</button></div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-[#51454c] dark:text-[#e2d5dd]">{label}{required && <span className="mr-1 text-[#b46783]">*</span>}</span>{children}</label>; }

function ConfirmDelete({ product, onConfirm, onCancel, deleting }: { product: Product; onConfirm: () => void; onCancel: () => void; deleting: boolean }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2e2430]/40 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] border border-[#eee5df] bg-white p-6 text-center shadow-2xl dark:border-[#3d3240] dark:bg-[#211c25]"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbe8e8] text-[#ba6669] dark:bg-[#432329]"><Trash2 className="h-6 w-6" /></div><h3 className="mt-4 text-lg font-extrabold text-[#332d35] dark:text-[#f8f0f5]">دڵنیایت لە سڕینەوەی ئەم بەرهەمە؟</h3><p className="mt-2 line-clamp-2 text-sm text-[#887b82] dark:text-[#b8abb4]">{product.name}</p><div className="mt-6 flex gap-3"><button onClick={onCancel} className="flex-1 rounded-2xl border border-[#e6dcd7] py-3 text-sm font-bold text-[#6e6068] dark:border-[#413642] dark:text-[#cabbc5]">پاشگەزبوونەوە</button><button onClick={onConfirm} disabled={deleting} className="flex-1 rounded-2xl bg-[#ba6669] py-3 text-sm font-bold text-white disabled:opacity-60">{deleting ? "سڕینەوە..." : "سڕینەوە"}</button></div></div></div>; }

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [screen, setScreen] = useState<Screen>("home");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | StockStatus>("all");
  const [sort, setSort] = useState<"recent" | "name" | "price" | "stock">("recent");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [cachedProducts, setCachedProducts] = useState<Product[]>(() => { try { return JSON.parse(localStorage.getItem("cosmetics-products-cache") || "[]"); } catch { return []; } });

  const queryInput = useMemo(() => ({ query: search || undefined, categoryId: categoryFilter === "all" ? undefined : Number(categoryFilter), stockStatus: stockFilter === "all" ? undefined : stockFilter, sort }), [search, categoryFilter, stockFilter, sort]);
  const categoriesQuery = trpc.categories.list.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const productsQuery = trpc.products.list.useQuery(queryInput, { enabled: isAuthenticated, staleTime: 10_000, refetchOnWindowFocus: true });
  const allProductsQuery = trpc.products.list.useQuery({ sort: "recent" }, { enabled: isAuthenticated, staleTime: 10_000, refetchOnWindowFocus: true });
  const utils = trpc.useUtils();
  const createProduct = trpc.products.create.useMutation({ onSuccess: async () => { await utils.products.list.invalidate(); setShowForm(false); toast.success("بەرهەمەکە بە سەرکەوتوویی پاشەکەوت کرا"); }, onError: error => toast.error(error.message || "بەرهەمەکە پاشەکەوت نەکرا") });
  const updateProduct = trpc.products.update.useMutation({ onSuccess: async () => { await utils.products.list.invalidate(); setEditingProduct(null); setDetailProduct(null); toast.success("گۆڕانکارییەکان پاشەکەوت کران"); }, onError: error => toast.error(error.message || "گۆڕانکارییەکان پاشەکەوت نەکران") });
  const deleteProduct = trpc.products.delete.useMutation({ onSuccess: async () => { await utils.products.list.invalidate(); setDeleteCandidate(null); setDetailProduct(null); toast.success("بەرهەمەکە سڕایەوە"); }, onError: error => toast.error(error.message || "نەتوانرا بەرهەمەکە بسڕدرێتەوە") });
  const uploadImage = trpc.media.uploadImage.useMutation();
  const createCategory = trpc.categories.create.useMutation({ onSuccess: async () => { await utils.categories.list.invalidate(); setNewCategory(""); toast.success("بەشەکە زیادکرا"); }, onError: error => toast.error(error.message || "نەتوانرا بەشەکە زیاد بکرێت") });

  const products = (productsQuery.data as Product[] | undefined) || (productsQuery.isError ? cachedProducts : []);
  const categories = (categoriesQuery.data as Category[] | undefined) || [];
  const allProducts = allProductsQuery.data as Product[] | undefined;
  const stats = { total: allProducts?.length || products.length, inStock: (allProducts || products).filter(p => p.stockStatus === "in_stock").length, outStock: (allProducts || products).filter(p => p.stockStatus === "out_of_stock").length, categories: categories.length };

  useEffect(() => { if (productsQuery.data) { setCachedProducts(productsQuery.data as Product[]); localStorage.setItem("cosmetics-products-cache", JSON.stringify(productsQuery.data)); } }, [productsQuery.data]);
  useEffect(() => { const on = () => setOffline(false); const off = () => setOffline(true); window.addEventListener("online", on); window.addEventListener("offline", off); navigator.serviceWorker?.register("/sw.js").catch(() => undefined); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);

  const openCreate = () => { setEditingProduct(null); setShowForm(true); };
  const openEdit = (product: Product) => { setDetailProduct(null); setEditingProduct(product); };
  const formInitial: FormState = editingProduct ? { name: editingProduct.name, price: String(editingProduct.price), notes: editingProduct.notes, sku: editingProduct.sku, categoryIds: selectedCategoryIds(editingProduct).map(String), stockStatus: editingProduct.stockStatus, imageUrl: editingProduct.imageUrl || null, imageKey: editingProduct.imageKey || null } : { ...EMPTY_FORM, categoryIds: categories[0] ? [String(categories[0].id)] : [] };
  const handleImageUpload = async (file: File, setForm: Dispatch<SetStateAction<FormState>>) => { if (!file.type.startsWith("image/")) { toast.error("تەنها فایلەکانی وێنە ڕێگەپێدراون"); return; } if (file.size > 12 * 1024 * 1024) { toast.error("قەبارەی وێنە نابێت لە ١٢MB زیاتر بێت"); return; } const reader = new FileReader(); reader.onload = async () => { const dataUrl = String(reader.result); setForm(prev => ({ ...prev, imageUrl: dataUrl })); try { const result = await uploadImage.mutateAsync({ fileName: file.name, mimeType: file.type, dataUrl }); setForm(prev => ({ ...prev, imageUrl: result.url, imageKey: result.key })); toast.success("وێنەکە بارکرا"); } catch (error: any) { toast.error(error.message || "بارکردنی وێنە سەرکەوتوو نەبوو"); } }; reader.readAsDataURL(file); };
  const saveForm = (form: FormState) => { const categoryIds = form.categoryIds.map(Number).filter(Boolean); const data = { name: form.name.trim(), price: Number(form.price.replace(/,/g, "")), notes: form.notes.trim(), sku: form.sku.trim(), categoryId: categoryIds[0], categoryIds, stockStatus: form.stockStatus, imageUrl: form.imageUrl, imageKey: form.imageKey }; if (!data.name || !data.price || !data.sku || !data.categoryIds.length) { toast.error("تکایە خانە پێویستەکان پڕ بکەرەوە"); return; } if (editingProduct) updateProduct.mutate({ id: editingProduct.id, data }); else createProduct.mutate(data); };
  const downloadImage = (product: Product) => { if (!product.imageUrl) { toast.error("ئەم بەرهەمە وێنەی نییە"); return; } const a = document.createElement("a"); a.href = product.imageUrl; a.download = `${product.sku || product.name}.jpg`; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove(); toast.success("داگرتنی وێنە دەستی پێکرد"); };
  const copyNotes = async (product: Product) => { try { await navigator.clipboard.writeText(product.notes || ""); toast.success("کۆپی کرا"); } catch { toast.error("نەتوانرا دەقی بەکارهێنان کۆپی بکرێت"); } };
  const handleLogout = async () => { try { await logout(); toast.success("بە سەرکەوتوویی چوویتە دەرەوە"); } catch { toast.error("چوونەدەرەوە سەرکەوتوو نەبوو"); } };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] dark:bg-[#15131a]"><div className="flex items-center gap-3 text-[#b46783]"><RefreshCw className="h-5 w-5 animate-spin" /><span className="font-bold">چاوەڕوان بە...</span></div></div>;
  if (!isAuthenticated) return <div dir="rtl" className="soft-grid flex min-h-screen items-center justify-center bg-[#faf9f7] px-5 dark:bg-[#15131a]"><div className="w-full max-w-md rounded-[32px] border border-[#eee5df] bg-white p-8 text-center shadow-[0_20px_60px_rgba(66,46,50,.1)] dark:border-[#3a303d] dark:bg-[#201c25]"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f5e6ea] text-[#b46783] dark:bg-[#3c2630]"><Sparkles className="h-8 w-8" /></div><p className="mt-6 text-xs font-extrabold tracking-[.2em] text-[#b46783]">بەڕێوەبەری جوانکاری</p><h1 className="mt-3 text-2xl font-extrabold text-[#332d35] dark:text-[#f8f0f5]">بەخێربێیت بۆ بەرهەمەکان</h1><p className="mt-3 text-sm leading-7 text-[#82767c] dark:text-[#b8abb4]">ئەم ئامێرە تایبەتییە بۆ تیمەکەتە. بۆ دەستگەیشتن بە داتابەیسی هاوبەش، تکایە بچۆ ژوورەوە.</p><button onClick={() => startLogin()} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b46783] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#b46783]/20 transition hover:bg-[#9f5874] active:scale-[.98]"><ShieldCheck className="h-4 w-4" /> چوونەژوورەوە</button><p className="mt-5 text-[11px] text-[#a19398]">تەنها بەکارهێنەرە ڕێپێدراوەکان دەتوانن بچنە ژوورەوە</p></div></div>;

  const renderContent = () => {
    if (detailProduct) return <DetailView product={detailProduct} onBack={() => setDetailProduct(null)} onEdit={() => openEdit(detailProduct)} onDelete={() => setDeleteCandidate(detailProduct)} onDownload={() => downloadImage(detailProduct)} onCopy={() => copyNotes(detailProduct)} />;
    if (screen === "settings") return <SettingsView theme={theme} toggleTheme={toggleTheme} categories={categories} newCategory={newCategory} setNewCategory={setNewCategory} onAddCategory={() => newCategory.trim() && createCategory.mutate({ name: newCategory.trim() })} onLogout={handleLogout} />;
    const title = screen === "home" ? "سڵاو، بەخێربێیت" : screen === "search" ? "گەڕانی بەرهەم" : "هەموو بەرهەمەکان";
    return <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10">{screen !== "home" && <div className="mb-7 flex items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold tracking-tight text-[#332d35] dark:text-[#f8f0f5] sm:text-3xl">{title}</h1></div><button onClick={openCreate} className="hidden items-center gap-2 rounded-2xl bg-[#b46783] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#b46783]/20 transition hover:bg-[#9f5874] active:scale-[.97] sm:inline-flex"><Plus className="h-4 w-4" /> زیادکردنی بەرهەم</button></div>}
      {screen === "home" && <><div className="mb-7 overflow-hidden rounded-[28px] bg-[#3b2632] p-5 text-white shadow-xl shadow-[#3b2632]/10 sm:p-7"><div className="relative z-10 max-w-xl"><div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15"><Search className="h-5 w-5 shrink-0 text-[#f3cbd7]" /><input value={search} onChange={e => { setSearch(e.target.value); setScreen("search"); }} placeholder="ناوی بەرهەم یان ID بنووسە" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#d6b5c2]" /><kbd className="hidden rounded-lg bg-white/10 px-2 py-1 text-[10px] text-[#e8cfd8] sm:block">گەڕان</kbd></div></div></div><div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><StatCard label="کۆی بەرهەمەکان" value={stats.total} icon={Package} tone="rose" /><StatCard label="بەردەستەکان" value={stats.inStock} icon={Check} tone="green" /><StatCard label="نەماوەکان" value={stats.outStock} icon={CloudOff} tone="red" /><StatCard label="بەشەکان" value={stats.categories} icon={BarChart3} tone="sand" /></div></>}
      {screen === "search" && <div className="mb-4 rounded-[22px] bg-[#f5e6ea] px-4 py-3 text-sm font-bold text-[#9f5874] dark:bg-[#3c2630] dark:text-[#f0b8c7]">گەڕانی ورد بۆ ناو، ID و تێبینییەکانی بەرهەم</div>}<Toolbar search={search} setSearch={setSearch} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} stockFilter={stockFilter} setStockFilter={setStockFilter} sort={sort} setSort={setSort} categories={categories} compact={screen === "home"} browseOnly={screen === "products"} />
      {productsQuery.isLoading && !cachedProducts.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"><>{Array.from({ length: 8 }).map((_, i) => <div key={i} className="animate-pulse overflow-hidden rounded-[24px] bg-white dark:bg-[#201c25]"><div className="aspect-[1.15] bg-[#eee5df] dark:bg-[#302934]" /><div className="space-y-3 p-4"><div className="h-4 rounded bg-[#eee5df] dark:bg-[#302934]" /><div className="h-3 w-1/2 rounded bg-[#eee5df] dark:bg-[#302934]" /></div></div>)}</></div> : products.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map(product => <ProductCard key={product.id} product={product} onOpen={() => setDetailProduct(product)} onEdit={() => openEdit(product)} onDelete={() => setDeleteCandidate(product)} onDownload={() => downloadImage(product)} />)}</div> : <EmptyState search={Boolean(search || categoryFilter !== "all" || stockFilter !== "all")} onAdd={openCreate} />}
      {productsQuery.isError && <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#fff2e3] px-4 py-3 text-xs font-semibold text-[#a16a32] dark:bg-[#3c3023] dark:text-[#f2c48b]"><CloudOff className="h-4 w-4" /> داتاکان لە cache ـەوە پیشان دەدرێن؛ پەیوەندی ئینتەرنێت بپشکنە.</div>}
    </main>;
  };

  return <div dir="rtl" className="min-h-screen bg-[#faf9f7] text-[#332d35] dark:bg-[#15131a] dark:text-[#f8f0f5]"><header className="sticky top-0 z-30 border-b border-[#eee5df]/80 bg-[#faf9f7]/90 backdrop-blur-xl dark:border-[#2d2731]/80 dark:bg-[#15131a]/90"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-end px-4 sm:px-6 lg:px-10"><div className="flex items-center gap-2"><span className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold sm:inline-flex ${offline ? "bg-[#fff2e3] text-[#a16a32] dark:bg-[#3c3023] dark:text-[#f2c48b]" : "bg-[#e6f4ed] text-[#398564] dark:bg-[#183b2a] dark:text-[#a8e5bf]"}`}><span className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-[#d9964a]" : "bg-[#43a968]"}`} />{offline ? "بێ ئینتەرنێت" : "هاوکاتکراوە"}</span><button onClick={toggleTheme} title="گۆڕینی شێوە" className="rounded-xl p-2.5 text-[#7f7078] transition hover:bg-[#f2e9e5] dark:text-[#d7c8d0] dark:hover:bg-[#2b2530]">{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button><button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efe2dc] text-xs font-extrabold text-[#8d5f5b] dark:bg-[#3b2d35] dark:text-[#e6b2ae]">{(user?.name || "ب").slice(0, 1)}</button></div></div></header><div className="mx-auto flex max-w-[1440px]"><aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-64 shrink-0 flex-col border-l border-[#eee5df] px-5 py-7 lg:flex dark:border-[#2d2731]"><p className="mb-3 px-3 text-[10px] font-extrabold tracking-[.15em] text-[#a29399]">بەڕێوەبردن</p><nav className="space-y-1">{navItems.map(item => { const Icon = item.icon; const active = screen === item.id && !detailProduct; return <button key={item.id} onClick={() => { setDetailProduct(null); setScreen(item.id); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? "bg-[#f5e6ea] text-[#b46783] dark:bg-[#3c2630] dark:text-[#f0b8c7]" : "text-[#81737b] hover:bg-[#f7f0ed] dark:text-[#b8abb4] dark:hover:bg-[#28222d]"}`}><Icon className="h-[18px] w-[18px]" />{item.label}</button>; })}</nav><div className="mt-auto rounded-2xl bg-[#f7efe5] p-4 dark:bg-[#2e271f]"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#aa7b53] dark:bg-[#493b2e]"><ShieldCheck className="h-4 w-4" /></div><p className="text-xs font-bold text-[#765a42] dark:text-[#e5c59e]">داتای پارێزراو</p><p className="mt-1 text-[11px] leading-5 text-[#967c63] dark:text-[#c3a883]">تەنها ئەندامانی تیم دەستیان پێدەگات.</p></div></aside><section className="min-w-0 flex-1">{renderContent()}</section></div><nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#eee5df] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-[#2d2731] dark:bg-[#201c25]/95 lg:hidden"><div className="mx-auto flex max-w-lg items-center justify-around">{navItems.map(item => { const Icon = item.icon; const active = screen === item.id && !detailProduct; return <button key={item.id} onClick={() => { setDetailProduct(null); setScreen(item.id); }} className={`flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${active ? "text-[#b46783]" : "text-[#96888f] dark:text-[#b8abb4]"}`}><Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />{item.label}</button>; })}<button onClick={openCreate} className="-mt-8 flex h-14 w-14 flex-col items-center justify-center rounded-[20px] bg-[#b46783] text-white shadow-xl shadow-[#b46783]/30 transition active:scale-95"><Plus className="h-6 w-6" /><span className="text-[9px] font-bold">زیادکردن</span></button></div></nav>{(showForm || editingProduct) && <ProductForm initial={formInitial} categories={categories} editing={Boolean(editingProduct)} saving={createProduct.isPending || updateProduct.isPending} uploading={uploadImage.isPending} onSave={saveForm} onCancel={() => { setShowForm(false); setEditingProduct(null); }} onImageUpload={handleImageUpload} />}{deleteCandidate && <ConfirmDelete product={deleteCandidate} deleting={deleteProduct.isPending} onCancel={() => setDeleteCandidate(null)} onConfirm={() => deleteProduct.mutate({ id: deleteCandidate.id })} />}</div>;
}

function Toolbar({ search, setSearch, categoryFilter, setCategoryFilter, stockFilter, setStockFilter, sort, setSort, categories, compact }: { search: string; setSearch: (v: string) => void; categoryFilter: string; setCategoryFilter: (v: string) => void; stockFilter: "all" | StockStatus; setStockFilter: (v: "all" | StockStatus) => void; sort: string; setSort: (v: any) => void; categories: Category[]; compact?: boolean; browseOnly?: boolean }) {
  const [open, setOpen] = useState(!compact);
  return <div className="mb-5 rounded-[24px] border border-[#eee5df] bg-white p-3 shadow-[0_8px_30px_rgba(66,46,50,.04)] dark:border-[#322b37] dark:bg-[#201c25]"><div className="flex flex-col gap-3 sm:flex-row"><div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[#faf6f3] px-4 py-2.5 dark:bg-[#2a242e]"><Search className="h-5 w-5 shrink-0 text-[#b46783]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ناوی بەرهەم، ID یان تێبینی بگەڕێ..." className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#a3959b] dark:placeholder:text-[#9f929c]" />{search && <button onClick={() => setSearch("")} className="text-[#a3959b]"><X className="h-4 w-4" /></button>}</div><button onClick={() => setOpen(!open)} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${open ? "bg-[#f5e6ea] text-[#b46783] dark:bg-[#3c2630]" : "bg-[#faf6f3] text-[#71636b] dark:bg-[#2a242e] dark:text-[#d8cbd3]"}`}><SlidersHorizontal className="h-4 w-4" /> فلتەر و ڕیزکردن <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} /></button></div>{open && <div className="mt-3 grid gap-3 border-t border-[#f1e9e4] pt-3 dark:border-[#342c37] sm:grid-cols-3"><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input"><option value="all">هەموو بەشەکان</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select value={stockFilter} onChange={e => setStockFilter(e.target.value as "all" | StockStatus)} className="input"><option value="all">هەموو دۆخەکان</option><option value="in_stock">تەنها بەردەست</option><option value="out_of_stock">تەنها نەماوە</option></select><select value={sort} onChange={e => setSort(e.target.value)} className="input"><option value="recent">نوێترین زیادکراو</option><option value="name">بەپێی ناو</option><option value="price">بەپێی نرخ</option><option value="stock">بەپێی دۆخی ستۆک</option></select></div>}</div>;
}

function DetailView({ product, onBack, onEdit, onDelete, onDownload, onCopy }: { product: Product; onBack: () => void; onEdit: () => void; onDelete: () => void; onDownload: () => void; onCopy: () => void }) {
  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10"><button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#867780] transition hover:text-[#b46783]"><ArrowRight className="h-4 w-4" /> گەڕانەوە بۆ بەرهەمەکان</button><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1fr]"><div className="relative aspect-square max-h-[620px] overflow-hidden rounded-[32px] bg-[#f6f0ed] dark:bg-[#2b2530]"><ProductImage product={product} large /><div className="absolute right-5 top-5"><StockBadge status={product.stockStatus} /></div></div><div className="rounded-[32px] border border-[#eee5df] bg-white p-6 shadow-[0_10px_35px_rgba(66,46,50,.05)] dark:border-[#322b37] dark:bg-[#201c25] sm:p-8"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-[#f8e9ed] px-3 py-1 text-xs font-bold text-[#b46783] dark:bg-[#3c2630] dark:text-[#f0b8c7]">{product.categoryName || "بەش"}</span><h1 className="mt-4 text-2xl font-extrabold leading-9 text-[#332d35] dark:text-[#f8f0f5] sm:text-3xl">{product.name}</h1></div><button onClick={onEdit} className="rounded-2xl bg-[#faf3ee] p-3 text-[#a56b60] transition hover:bg-[#f5e1e2] dark:bg-[#332930] dark:text-[#e0aaa0]"><Edit3 className="h-5 w-5" /></button></div><div className="mt-7 rounded-2xl bg-[#fbf7f4] p-4 dark:bg-[#2a242e]"><p className="text-xs font-bold text-[#998b91]">نرخ</p><p className="mt-1 text-3xl font-extrabold text-[#b46783]">{formatPrice(product.price)}</p></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#f0e7e2] p-4 dark:border-[#362e39]"><p className="text-xs font-bold text-[#998b91]">ID</p><p dir="ltr" className="mt-1 truncate text-sm font-bold text-[#51454c] dark:text-[#e2d5dd]">{product.sku}</p></div><div className="rounded-2xl border border-[#f0e7e2] p-4 dark:border-[#362e39]"><p className="text-xs font-bold text-[#998b91]">دۆخ</p><div className="mt-2"><StockBadge status={product.stockStatus} /></div></div></div><div className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-extrabold text-[#433840] dark:text-[#f0e5eb]">بەکارهێنان / تێبینی</h2><button onClick={onCopy} className="inline-flex items-center gap-2 rounded-xl bg-[#f5e6ea] px-3 py-2 text-xs font-extrabold text-[#b46783] transition hover:bg-[#efd7df] dark:bg-[#3c2630] dark:text-[#f0b8c7]"><Clipboard className="h-4 w-4" /> بەرکارهێنا</button></div><div className="min-h-28 rounded-2xl bg-[#fbf7f4] p-4 text-sm leading-8 text-[#6e6068] dark:bg-[#2a242e] dark:text-[#d8cbd3]">{product.notes || "هیچ تێبینییەک نییە."}</div></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={onDownload} disabled={!product.imageUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b46783] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#b46783]/20 transition hover:bg-[#9f5874] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /> داگرتنی وێنە</button><button onClick={onDelete} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#efcccc] px-4 py-3.5 text-sm font-bold text-[#b45d61] transition hover:bg-[#fff2f2] dark:border-[#66383e] dark:hover:bg-[#432329]"><Trash2 className="h-4 w-4" /> سڕینەوە</button></div></div></div></main>;
}

function SettingsView({ theme, toggleTheme, categories, newCategory, setNewCategory, onAddCategory, onLogout }: { theme: string; toggleTheme?: () => void; categories: Category[]; newCategory: string; setNewCategory: (v: string) => void; onAddCategory: () => void; onLogout: () => void }) {
  return <main className="mx-auto max-w-4xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10"><div className="mb-7"><p className="mb-1 text-sm font-medium text-[#9a8d91]">کۆنترۆڵی ئەپ</p><h1 className="text-2xl font-extrabold tracking-tight text-[#332d35] dark:text-[#f8f0f5]">ڕێکخستنەکان</h1></div><div className="space-y-5"><section className="rounded-[28px] border border-[#eee5df] bg-white p-5 shadow-[0_8px_30px_rgba(66,46,50,.04)] dark:border-[#322b37] dark:bg-[#201c25]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5e6ea] text-[#b46783] dark:bg-[#3c2630]"><Palette className="h-5 w-5" /></div><div><h2 className="font-extrabold text-[#332d35] dark:text-[#f8f0f5]">شێوەی ڕووکار</h2><p className="mt-1 text-xs text-[#8d7e85]">ڕووناک یان تاریک، بە دڵخوازیت</p></div></div><button onClick={toggleTheme} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[#faf6f3] p-4 text-sm font-bold text-[#5f5159] dark:bg-[#2a242e] dark:text-[#e2d5dd]"><span className="flex items-center gap-3">{theme === "light" ? <Sun className="h-5 w-5 text-[#aa7b53]" /> : <Moon className="h-5 w-5 text-[#b46783]" />}{theme === "light" ? "شێوەی ڕووناک" : "شێوەی تاریک"}</span><span className="rounded-full bg-[#e9ddd8] px-3 py-1 text-xs dark:bg-[#433745]">گۆڕین</span></button></section><section className="rounded-[28px] border border-[#eee5df] bg-white p-5 shadow-[0_8px_30px_rgba(66,46,50,.04)] dark:border-[#322b37] dark:bg-[#201c25]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7efe5] text-[#aa7b53] dark:bg-[#3c3023]"><FolderPlus className="h-5 w-5" /></div><div><h2 className="font-extrabold text-[#332d35] dark:text-[#f8f0f5]">بەڕێوەبردنی بەشەکان</h2><p className="mt-1 text-xs text-[#8d7e85]">بەشی نوێ زیاد بکە بێ دەستکاریکردنی کۆد</p></div></div><div className="mt-5 flex gap-2"><input value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === "Enter" && onAddCategory()} placeholder="ناوی بەشی نوێ..." className="input flex-1" /><button onClick={onAddCategory} className="inline-flex items-center gap-2 rounded-2xl bg-[#b46783] px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" /> زیادکردن</button></div><div className="mt-4 flex flex-wrap gap-2">{categories.map(category => <span key={category.id} className="rounded-full bg-[#faf3ee] px-3 py-1.5 text-xs font-bold text-[#a56b60] dark:bg-[#332930] dark:text-[#e0aaa0]">{category.name}</span>)}</div></section><section className="rounded-[28px] border border-[#eee5df] bg-white p-5 shadow-[0_8px_30px_rgba(66,46,50,.04)] dark:border-[#322b37] dark:bg-[#201c25]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6f4ed] text-[#398564] dark:bg-[#183b2a]"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-extrabold text-[#332d35] dark:text-[#f8f0f5]">داتای هاوبەش و پارێزراو</h2><p className="mt-1 text-xs leading-5 text-[#8d7e85]">بەرهەمەکان لە داتابەیسی ئۆنلاین هەڵدەگیرێن و cache ـی ناوخۆ بۆ بینینی بێ ئینتەرنێت هەیە.</p></div></div></section><button onClick={onLogout} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#efcccc] bg-white px-4 py-3.5 text-sm font-bold text-[#b45d61] transition hover:bg-[#fff2f2] dark:border-[#66383e] dark:bg-[#201c25] dark:hover:bg-[#432329]"><LogOut className="h-4 w-4" /> چوونەدەرەوە</button></div></main>;
}

// Tailwind utility classes used by forms. Kept here to make the form controls consistent across themes.
