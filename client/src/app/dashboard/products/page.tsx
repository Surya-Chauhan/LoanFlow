"use client";
// src/app/dashboard/products/page.tsx
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { formatCurrency } from "@/lib/bre";
import { Package, Plus, Pencil, Check, X } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  maxTenure: number;
  processingFee: number;
  active: boolean;
}

const EMPTY = { name: "", minAmount: 0, maxAmount: 0, interestRate: 0, maxTenure: 0, processingFee: 0, active: true };

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getLoanProducts();
      setProducts(res.data.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      interestRate: p.interestRate,
      maxTenure: p.maxTenure,
      processingFee: p.processingFee,
      active: p.active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await dashboardApi.updateLoanProduct(editing._id, form);
        toast.success("Product updated");
      } else {
        await dashboardApi.createLoanProduct(form);
        toast.success("Product created");
      }
      setShowForm(false);
      fetchProducts();
    } catch {
      toast.error("Failed to save product");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Package size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Loan Products</h1>
            <p className="text-slate-500 text-sm">Configure available loan products</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 skeleton h-40" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No loan products configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p._id} className="card card-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900">{p.name}</h3>
                  <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition">
                  <Pencil size={15} />
                </button>
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Amount Range</span><span className="font-medium text-slate-800">{formatCurrency(p.minAmount)} – {formatCurrency(p.maxAmount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Interest Rate</span><span className="font-medium text-slate-800">{p.interestRate}% p.a.</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Max Tenure</span><span className="font-medium text-slate-800">{p.maxTenure} days</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Processing Fee</span><span className="font-medium text-slate-800">{formatCurrency(p.processingFee)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editing ? "Edit Product" : "New Product"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Product Name</label>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Personal Loan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Min Amount</label>
                  <input type="number" className="input-field" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Max Amount</label>
                  <input type="number" className="input-field" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Interest Rate (%)</label>
                  <input type="number" className="input-field" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Max Tenure (days)</label>
                  <input type="number" className="input-field" value={form.maxTenure} onChange={(e) => setForm({ ...form, maxTenure: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Processing Fee</label>
                  <input type="number" className="input-field" value={form.processingFee} onChange={(e) => setForm({ ...form, processingFee: Number(e.target.value) })} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Check size={16} /> {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <ProductsContent />
    </RoleGuard>
  );
}