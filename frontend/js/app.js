/* ============================================================
   Parrilla Vaca Bar & Grill — Inventory System
   frontend/js/app.js
   ============================================================ */

/* ---------------- API client ---------------- */
const API = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (res.status === 401) {
      if (!location.pathname.endsWith("login.html"))
        location.href = "login.html";
      return null;
    }
    const raw = await res.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: raw };
      }
    }
    if (!res.ok)
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  },
  get(p) {
    return this.request(p);
  },
  post(p, b) {
    return this.request(p, { method: "POST", body: JSON.stringify(b || {}) });
  },
  put(p, b) {
    return this.request(p, { method: "PUT", body: JSON.stringify(b || {}) });
  },
  del(p) {
    return this.request(p, { method: "DELETE" });
  },
};

/* ---------------- Utilities ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pad = (n) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const addDaysISO = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).slice(0, 10) + "T00:00:00");
  return isNaN(d)
    ? String(v)
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};
const titleCase = (v) =>
  String(v || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const relTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(ts);
};

const money = (n) => {
  const num = Number(n) || 0;
  return (
    "₱" +
    num.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};
const qty = (n, unit) => {
  const num = Number(n) || 0;
  const trimmed = Number.isInteger(num) ? num : +num.toFixed(3);
  return unit ? `${trimmed} ${unit}` : String(trimmed);
};

const ITEM_STATUS_BADGE = {
  ok: "badge--green",
  low: "badge--amber",
  out: "badge--red",
};
const statusBadge = (s) =>
  `<span class="badge ${ITEM_STATUS_BADGE[s] || ""}">${esc(titleCase(s))}</span>`;

const USAGE_REASONS = [
  { value: "kitchen_prep", label: "Kitchen prep" },
  { value: "wastage", label: "Wastage" },
  { value: "spoilage", label: "Spoilage" },
  { value: "staff_meal", label: "Staff meal" },
  { value: "transfer", label: "Transfer" },
];
const usageReasonLabel = (v) =>
  (USAGE_REASONS.find((r) => r.value === v) || { label: titleCase(v) }).label;

const CATEGORIES = [
  "Beef",
  "Poultry",
  "Seafood",
  "Produce",
  "Dry Goods",
  "Beverage",
  "Dessert",
  "Packaging",
  "Other",
];

const UNITS = ["kg", "g", "L", "ml", "pcs", "bottle", "can", "pack", "case"];

/* ---------------- Toast ---------------- */
function toast(message, type = "") {
  const stack = $("#toastStack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = "toast" + (type ? ` toast--${type}` : "");
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s, transform .25s";
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    setTimeout(() => el.remove(), 260);
  }, 3400);
}

/* ---------------- Modal + form builder ---------------- */
function renderField(f) {
  const id = `f_${f.name}`;
  const full = f.full ? " field--full" : "";
  const req = f.required ? "required" : "";
  let control;
  if (f.type === "select") {
    control = `<select id="${id}" name="${f.name}" class="input" ${req}>${(
      f.options || []
    )
      .map(
        (o) =>
          `<option value="${esc(o.value)}"${String(o.value) === String(f.value ?? "") ? " selected" : ""}>${esc(o.label)}</option>`,
      )
      .join("")}</select>`;
  } else if (f.type === "textarea") {
    control = `<textarea id="${id}" name="${f.name}" class="input" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || "")}" ${req}>${esc(f.value ?? "")}</textarea>`;
  } else {
    const min = f.min != null ? `min="${f.min}"` : "";
    const max = f.max != null ? `max="${f.max}"` : "";
    const step = f.step != null ? `step="${f.step}"` : "";
    control = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" class="input" value="${esc(f.value ?? "")}" placeholder="${esc(f.placeholder || "")}" ${req} ${min} ${max} ${step}>`;
  }
  return `<div class="field${full}"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>${control}</div>`;
}

function openForm({
  title,
  fields,
  submitLabel = "Save",
  wide = false,
  note = "",
  onSubmit,
}) {
  const root = $("#modalRoot");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal${wide ? " modal--wide" : ""}" role="dialog" aria-modal="true">
      <header class="modal__head">
        <h2>${esc(title)}</h2>
        <button type="button" class="modal__close" data-close aria-label="Close">&times;</button>
      </header>
      <form class="modal__form" novalidate>
        <div class="modal__body">
          ${note ? `<p class="form-note">${esc(note)}</p>` : ""}
          ${fields.map(renderField).join("")}
        </div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">${esc(submitLabel)}</button>
        </footer>
      </form>
    </div>`;
  root.appendChild(backdrop);

  const form = $("form", backdrop);
  const submitBtn = $('button[type="submit"]', backdrop);
  const close = () => {
    backdrop.style.opacity = "0";
    backdrop.style.transition = "opacity .14s";
    setTimeout(() => backdrop.remove(), 140);
  };

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-close]")) close();
  });
  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);

  const first = $("input, select, textarea", backdrop);
  if (first) setTimeout(() => first.focus(), 40);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = "Saving…";
    try {
      await onSubmit(values, { close, form });
      close();
    } catch (err) {
      let box = $(".form-error", form);
      if (!box) {
        box = document.createElement("p");
        box.className = "form-error";
        $(".modal__body", backdrop).appendChild(box);
      }
      box.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });
  return { close, form };
}

function confirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
}) {
  return new Promise((resolve) => {
    const root = $("#modalRoot");
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" style="max-width:420px" role="dialog" aria-modal="true">
        <header class="modal__head">
          <h2>${esc(title)}</h2>
          <button type="button" class="modal__close" data-close>&times;</button>
        </header>
        <div class="modal__body" style="grid-template-columns:1fr">
          <p style="color:var(--ink-2);font-size:13px">${esc(message)}</p>
        </div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost" data-close>Cancel</button>
          <button type="button" class="btn ${danger ? "btn--danger" : "btn--gold"}" data-confirm>${esc(confirmLabel)}</button>
        </footer>
      </div>`;
    root.appendChild(backdrop);
    const done = (v) => {
      backdrop.remove();
      resolve(v);
    };
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest("[data-close]"))
        done(false);
      if (e.target.closest("[data-confirm]")) done(true);
    });
  });
}

/* ---------------- Session + shell ---------------- */
const NAV = [
  {
    href: "dashboard.html",
    label: "Dashboard",
    page: "dashboard",
    icon: "layout-dashboard",
  },
  { href: "items.html", label: "Items", page: "items", icon: "package" },
  {
    href: "deliveries.html",
    label: "Deliveries",
    page: "deliveries",
    icon: "truck",
  },
  { href: "usage.html", label: "Usage", page: "usage", icon: "utensils" },
  {
    href: "suppliers.html",
    label: "Suppliers",
    page: "suppliers",
    icon: "users",
  },
  {
    href: "reports.html",
    label: "Reports",
    page: "reports",
    icon: "bar-chart-3",
  },
];

async function requireSession() {
  try {
    const d = await API.get("/api/auth/me");
    if (!d || !d.user) {
      location.href = "login.html";
      return null;
    }
    return d.user;
  } catch {
    location.href = "login.html";
    return null;
  }
}

function renderShell(user, page) {
  const sb = $("#sidebar");
  if (!sb) return;
  sb.innerHTML = `
    <div class="sidebar__top">
      <div class="brand">
        <span class="brand__mark">PV</span>
        <span class="brand__text">
          <strong>Parrilla Vaca</strong>
          <em>Inventory</em>
        </span>
      </div>
      <div class="sidebar__foot">
        <div class="user">
          <span class="user__name">${esc(user.full_name)}</span>
          <span class="user__role">${user.role === "admin" ? "Administrator" : "Staff"}</span>
        </div>
        <button type="button" class="btn btn--ghost btn--block" id="logoutBtn">Sign out</button>
      </div>
    </div>
    <nav class="nav">
      <span class="nav__label">Stockroom</span>
      ${NAV.map(
        (n) => `
        <a class="nav__link${n.page === page ? " is-active" : ""}" href="${n.href}">
          <i data-lucide="${n.icon}"></i>
          <span>${n.label}</span>
        </a>`,
      ).join("")}
    </nav>`;

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  $("#logoutBtn").addEventListener("click", async () => {
    try {
      await API.post("/api/auth/logout", {});
    } catch {}
    location.href = "login.html";
  });
}

/* ---------------- Caches ---------------- */
let itemsCache = null,
  suppliersCache = null;
async function getItems() {
  if (!itemsCache) itemsCache = await API.get("/api/items");
  return itemsCache;
}
async function getSuppliers() {
  if (!suppliersCache) suppliersCache = await API.get("/api/suppliers");
  return suppliersCache;
}
function invalidateCaches() {
  itemsCache = null;
  suppliersCache = null;
}

/* ============================================================
   Page: login
   ============================================================ */
async function initLogin() {
  const form = $("#loginForm");
  const errorBox = $("#loginError");
  const btn = $('button[type="submit"]', form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    btn.disabled = true;
    btn.textContent = "Signing in…";
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const data = await API.post("/api/auth/login", values);
      if (data && data.user) {
        location.href = "dashboard.html";
        return;
      }
      throw new Error("Invalid credentials.");
    } catch (err) {
      errorBox.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });
}

/* ============================================================
   Page: dashboard
   ============================================================ */
async function initDashboard() {
  $("#todayLabel").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const data = await API.get("/api/reports/dashboard");
  const t = data.totals || {};
  const today = data.today || {};

  $("#stats").innerHTML = [
    {
      label: "Items tracked",
      value: t.items ?? 0,
      meta: `${t.ok ?? 0} at par`,
    },
    {
      label: "Low stock",
      value: t.low ?? 0,
      meta: "At or below reorder point",
    },
    { label: "Out of stock", value: t.out ?? 0, meta: "Needs immediate order" },
    {
      label: "Inventory value",
      value: money(t.total_value ?? 0),
      meta: `${today.deliveries ?? 0} deliveries today`,
    },
  ]
    .map(
      (c) => `
    <div class="stat">
      <div class="stat__label">${esc(c.label)}</div>
      <div class="stat__value">${esc(c.value)}</div>
      <div class="stat__meta">${esc(c.meta)}</div>
    </div>`,
    )
    .join("");

  const low = $("#lowStock");
  if (!data.low_items || !data.low_items.length) {
    low.innerHTML =
      '<li class="empty">Nothing is below the reorder point right now.</li>';
  } else {
    low.innerHTML = data.low_items
      .map(
        (i) => `
      <li>
        <div class="feed__body">
          <strong>${esc(i.name)}</strong>
          <span>${esc(i.category)} · ${qty(i.quantity, i.unit)} in stock · reorder at ${qty(i.reorder, i.unit)}</span>
        </div>
        <span class="badge ${ITEM_STATUS_BADGE[i.status] || ""}">${esc(titleCase(i.status))}</span>
      </li>`,
      )
      .join("");
  }

  const cats = data.by_category || [];
  const maxVal = Math.max(1, ...cats.map((c) => c.value));
  const breakdown = $("#categoryBreakdown");
  if (!cats.length) {
    breakdown.innerHTML = '<p class="empty">No items on file yet.</p>';
  } else {
    breakdown.innerHTML = cats
      .map((c) => {
        const pct = Math.max(2, Math.round((c.value / maxVal) * 100));
        return `
        <div class="bar-row">
          <span class="bar-row__label">${esc(c.category)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
          <span class="bar-row__value">${money(c.value)}</span>
        </div>`;
      })
      .join("");
  }

  $("#todaySummary").innerHTML = `
    <div class="metric">
      <span class="metric__label">Deliveries received</span>
      <span class="metric__value">${today.deliveries ?? 0}</span>
      <span class="metric__meta">${money(today.deliveries_value ?? 0)} in stock today</span>
    </div>
    <div class="metric">
      <span class="metric__label">Usage entries</span>
      <span class="metric__value">${today.usage_entries ?? 0}</span>
      <span class="metric__meta">Recorded across kitchen and floor</span>
    </div>
    <div class="metric">
      <span class="metric__label">Total items</span>
      <span class="metric__value">${t.items ?? 0}</span>
      <span class="metric__meta">${t.low ?? 0} low · ${t.out ?? 0} out</span>
    </div>`;
}

/* ============================================================
   Page: items
   ============================================================ */
async function refreshItems() {
  const params = new URLSearchParams();
  const q = $("#filterSearch").value.trim();
  const cat = $("#filterCategory").value;
  const st = $("#filterStatus").value;
  if (q) params.set("q", q);
  if (cat) params.set("category", cat);
  if (st) params.set("status", st);

  const rows = await API.get(
    "/api/items" + (params.toString() ? "?" + params : ""),
  );
  itemsCache = rows;

  const body = $("#itemBody");
  if (!rows || !rows.length) {
    body.innerHTML =
      '<tr><td colspan="8" class="empty">No items match these filters.</td></tr>';
    return;
  }

  body.innerHTML = rows
    .map(
      (i) => `
    <tr>
      <td><strong>${esc(i.name)}</strong></td>
      <td>${esc(i.category)}</td>
      <td class="num">${qty(i.quantity, i.unit)}</td>
      <td class="num">${qty(i.reorder, i.unit)}</td>
      <td class="num">${qty(i.par, i.unit)}</td>
      <td class="num">${money(i.unit_cost)}</td>
      <td>${statusBadge(i.status)}</td>
      <td>
        <div class="actions">
          <button class="btn btn--sm btn--ghost" data-edit="${i.id}">Edit</button>
          <button class="btn btn--sm btn--danger" data-delete="${i.id}">Delete</button>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  $$("[data-edit]", body).forEach((btn) =>
    btn.addEventListener("click", () => {
      const it = rows.find((x) => String(x.id) === btn.dataset.edit);
      if (it) openItemForm(it);
    }),
  );
  $$("[data-delete]", body).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const it = rows.find((x) => String(x.id) === btn.dataset.delete);
      const ok = await confirmDialog({
        title: `Delete ${it ? it.name : "item"}`,
        message:
          "This removes the item from the catalog. Past deliveries and usage entries are kept as historical records.",
        confirmLabel: "Delete",
      });
      if (!ok) return;
      try {
        await API.del(`/api/items/${btn.dataset.delete}`);
        toast("Item deleted.", "ok");
        invalidateCaches();
        await refreshItems();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

async function openItemForm(existing) {
  const suppliers = await getSuppliers();
  const isEdit = !!existing;

  const supplierOptions = [{ value: "", label: "— Unassigned —" }].concat(
    suppliers.map((s) => ({ value: s.name, label: s.name })),
  );
  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: c }));
  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));

  openForm({
    title: isEdit ? `Edit item · ${existing.name}` : "Add item",
    submitLabel: isEdit ? "Save changes" : "Add item",
    wide: true,
    note: isEdit
      ? "Editing quantity directly overrides the running balance. To adjust through normal channels, use Deliveries or Usage."
      : "",
    fields: [
      {
        name: "name",
        label: "Item name",
        required: true,
        value: isEdit ? existing.name : "",
        placeholder: "e.g. Ribeye Steak (250g cut)",
        full: true,
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        value: isEdit ? existing.category : "Beef",
        options: categoryOptions,
      },
      {
        name: "unit",
        label: "Unit",
        type: "select",
        value: isEdit ? existing.unit : "kg",
        options: unitOptions,
      },
      {
        name: "quantity",
        label: "Quantity on hand",
        type: "number",
        step: "0.001",
        min: 0,
        required: true,
        value: isEdit ? existing.quantity : 0,
      },
      {
        name: "reorder",
        label: "Reorder point",
        type: "number",
        step: "0.001",
        min: 0,
        required: true,
        value: isEdit ? existing.reorder : 0,
      },
      {
        name: "par",
        label: "Par level",
        type: "number",
        step: "0.001",
        min: 0,
        value: isEdit ? existing.par : 0,
      },
      {
        name: "unit_cost",
        label: "Unit cost (₱)",
        type: "number",
        step: "0.01",
        min: 0,
        value: isEdit ? existing.unit_cost : 0,
      },
      {
        name: "supplier",
        label: "Supplier",
        type: "select",
        value: isEdit ? existing.supplier : "",
        options: supplierOptions,
        full: true,
      },
    ],
    onSubmit: async (v) => {
      const payload = {
        name: v.name.trim(),
        category: v.category,
        unit: v.unit,
        quantity: Number(v.quantity),
        reorder: Number(v.reorder),
        par: Number(v.par),
        unit_cost: Number(v.unit_cost),
        supplier: v.supplier,
      };
      if (isEdit) await API.put(`/api/items/${existing.id}`, payload);
      else await API.post("/api/items", payload);
      toast(isEdit ? "Item updated." : "Item added.", "ok");
      invalidateCaches();
      await refreshItems();
    },
  });
}

async function initItems() {
  await getSuppliers();
  const catSel = $("#filterCategory");
  CATEGORIES.forEach((c) =>
    catSel.insertAdjacentHTML(
      "beforeend",
      `<option value="${esc(c)}">${esc(c)}</option>`,
    ),
  );

  $("#newItem").addEventListener("click", () => openItemForm(null));

  let debounce;
  $("#filterSearch").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(refreshItems, 260);
  });
  $("#filterCategory").addEventListener("change", refreshItems);
  $("#filterStatus").addEventListener("change", refreshItems);
  $("#clearFilters").addEventListener("click", () => {
    $("#filterSearch").value = "";
    $("#filterCategory").value = "";
    $("#filterStatus").value = "";
    refreshItems();
  });

  await refreshItems();
  if (new URLSearchParams(location.search).get("new") === "1")
    openItemForm(null);
}

/* ============================================================
   Page: deliveries
   ============================================================ */
async function refreshDeliveries() {
  const params = new URLSearchParams();
  const from = $("#filterFrom").value;
  const to = $("#filterTo").value;
  const item = $("#filterItem").value;
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (item) params.set("item_id", item);

  const rows = await API.get(
    "/api/deliveries" + (params.toString() ? "?" + params : ""),
  );
  const body = $("#deliveryBody");
  if (!rows || !rows.length) {
    body.innerHTML =
      '<tr><td colspan="7" class="empty">No deliveries in this view.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (d) => `
    <tr>
      <td>${fmtDate(d.date)}</td>
      <td><strong>${esc(d.item_name)}</strong></td>
      <td class="num">${qty(d.quantity)}</td>
      <td class="num">${money(d.unit_cost)}</td>
      <td class="num">${money(d.total)}</td>
      <td>${esc(d.supplier || "—")}${d.invoice ? `<div class="muted" style="font-size:11.5px">${esc(d.invoice)}</div>` : ""}</td>
      <td>
        <div class="actions">
          <button class="btn btn--sm btn--danger" data-delete="${d.id}">Reverse</button>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  $$("[data-delete]", body).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const d = rows.find((x) => String(x.id) === btn.dataset.delete);
      const ok = await confirmDialog({
        title: "Reverse delivery",
        message: `This will subtract ${d.quantity} from ${d.item_name} and remove the delivery record.`,
        confirmLabel: "Reverse",
      });
      if (!ok) return;
      try {
        await API.del(`/api/deliveries/${btn.dataset.delete}`);
        toast("Delivery reversed.", "ok");
        invalidateCaches();
        await refreshDeliveries();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

async function openDeliveryForm() {
  const items = await getItems();
  if (!items.length) {
    toast("Add items to the catalog first.", "err");
    return;
  }

  const itemOptions = items.map((i) => ({
    value: i.id,
    label: `${i.name} · ${qty(i.quantity, i.unit)} on hand`,
  }));

  openForm({
    title: "Record delivery",
    submitLabel: "Record delivery",
    wide: true,
    note: "Recording a delivery adds the quantity to the item's stock and updates its unit cost.",
    fields: [
      {
        name: "item_id",
        label: "Item",
        type: "select",
        required: true,
        value: items[0].id,
        options: itemOptions,
        full: true,
      },
      {
        name: "quantity",
        label: "Quantity received",
        type: "number",
        step: "0.001",
        min: 0.001,
        required: true,
        value: 1,
      },
      {
        name: "unit_cost",
        label: "Unit cost (₱)",
        type: "number",
        step: "0.01",
        min: 0,
        value: items[0].unit_cost,
      },
      {
        name: "supplier",
        label: "Supplier",
        value: items[0].supplier || "",
        placeholder: "e.g. Bicol Prime Meats",
      },
      {
        name: "invoice",
        label: "Invoice / DR number",
        value: "",
        placeholder: "e.g. BPM-1042",
      },
      {
        name: "date",
        label: "Date received",
        type: "date",
        required: true,
        value: todayISO(),
      },
      {
        name: "received_by",
        label: "Received by",
        value: "",
        placeholder: "Optional",
      },
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        value: "",
        placeholder: "Optional",
        full: true,
      },
    ],
    onSubmit: async (v) => {
      await API.post("/api/deliveries", {
        item_id: Number(v.item_id),
        quantity: Number(v.quantity),
        unit_cost: Number(v.unit_cost),
        supplier: v.supplier.trim(),
        invoice: v.invoice.trim(),
        date: v.date,
        received_by: v.received_by.trim(),
        notes: v.notes.trim(),
      });
      toast("Delivery recorded.", "ok");
      invalidateCaches();
      await refreshDeliveries();
    },
  });
}

async function initDeliveries() {
  const items = await getItems();
  const itemSel = $("#filterItem");
  items.forEach((i) =>
    itemSel.insertAdjacentHTML(
      "beforeend",
      `<option value="${i.id}">${esc(i.name)}</option>`,
    ),
  );

  $("#filterTo").value = todayISO();
  $("#filterFrom").value = addDaysISO(todayISO(), -29);

  $("#newDelivery").addEventListener("click", openDeliveryForm);
  $("#filterFrom").addEventListener("change", refreshDeliveries);
  $("#filterTo").addEventListener("change", refreshDeliveries);
  $("#filterItem").addEventListener("change", refreshDeliveries);
  $("#clearFilters").addEventListener("click", () => {
    $("#filterFrom").value = "";
    $("#filterTo").value = "";
    $("#filterItem").value = "";
    refreshDeliveries();
  });

  await refreshDeliveries();
}

/* ============================================================
   Page: usage
   ============================================================ */
async function refreshUsage() {
  const params = new URLSearchParams();
  const from = $("#filterFrom").value;
  const to = $("#filterTo").value;
  const item = $("#filterItem").value;
  const reason = $("#filterReason").value;
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (item) params.set("item_id", item);
  if (reason) params.set("reason", reason);

  const rows = await API.get(
    "/api/usage" + (params.toString() ? "?" + params : ""),
  );
  const body = $("#usageBody");
  if (!rows || !rows.length) {
    body.innerHTML =
      '<tr><td colspan="6" class="empty">No usage in this view.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (u) => `
    <tr>
      <td>${fmtDate(u.date)}</td>
      <td><strong>${esc(u.item_name)}</strong></td>
      <td class="num">${qty(u.quantity)}</td>
      <td><span class="badge badge--plain">${esc(usageReasonLabel(u.reason))}</span></td>
      <td>${esc(u.recorded_by || "—")}</td>
      <td>
        <div class="actions">
          <button class="btn btn--sm btn--danger" data-delete="${u.id}">Reverse</button>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  $$("[data-delete]", body).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const u = rows.find((x) => String(x.id) === btn.dataset.delete);
      const ok = await confirmDialog({
        title: "Reverse usage entry",
        message: `This will add ${u.quantity} back to ${u.item_name} and remove the usage record.`,
        confirmLabel: "Reverse",
      });
      if (!ok) return;
      try {
        await API.del(`/api/usage/${btn.dataset.delete}`);
        toast("Usage reversed.", "ok");
        invalidateCaches();
        await refreshUsage();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

async function openUsageForm() {
  const items = await getItems();
  if (!items.length) {
    toast("Add items to the catalog first.", "err");
    return;
  }

  const itemOptions = items.map((i) => ({
    value: i.id,
    label: `${i.name} · ${qty(i.quantity, i.unit)} on hand`,
  }));

  openForm({
    title: "Record usage",
    submitLabel: "Record usage",
    wide: true,
    note: "Recording usage subtracts the quantity from the item's stock. The system prevents usage greater than the current balance.",
    fields: [
      {
        name: "item_id",
        label: "Item",
        type: "select",
        required: true,
        value: items[0].id,
        options: itemOptions,
        full: true,
      },
      {
        name: "quantity",
        label: "Quantity used",
        type: "number",
        step: "0.001",
        min: 0.001,
        required: true,
        value: 1,
      },
      {
        name: "reason",
        label: "Reason",
        type: "select",
        value: "kitchen_prep",
        options: USAGE_REASONS,
      },
      {
        name: "date",
        label: "Date",
        type: "date",
        required: true,
        value: todayISO(),
        full: true,
      },
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        value: "",
        placeholder: "Optional — e.g. dinner service, spoilage in walk-in",
        full: true,
      },
    ],
    onSubmit: async (v) => {
      await API.post("/api/usage", {
        item_id: Number(v.item_id),
        quantity: Number(v.quantity),
        reason: v.reason,
        date: v.date,
        notes: v.notes.trim(),
      });
      toast("Usage recorded.", "ok");
      invalidateCaches();
      await refreshUsage();
    },
  });
}

async function initUsage() {
  const items = await getItems();
  const itemSel = $("#filterItem");
  items.forEach((i) =>
    itemSel.insertAdjacentHTML(
      "beforeend",
      `<option value="${i.id}">${esc(i.name)}</option>`,
    ),
  );

  const reasonSel = $("#filterReason");
  USAGE_REASONS.forEach((r) =>
    reasonSel.insertAdjacentHTML(
      "beforeend",
      `<option value="${r.value}">${esc(r.label)}</option>`,
    ),
  );

  $("#filterTo").value = todayISO();
  $("#filterFrom").value = addDaysISO(todayISO(), -29);

  $("#newUsage").addEventListener("click", openUsageForm);
  $("#filterFrom").addEventListener("change", refreshUsage);
  $("#filterTo").addEventListener("change", refreshUsage);
  $("#filterItem").addEventListener("change", refreshUsage);
  $("#filterReason").addEventListener("change", refreshUsage);
  $("#clearFilters").addEventListener("click", () => {
    $("#filterFrom").value = "";
    $("#filterTo").value = "";
    $("#filterItem").value = "";
    $("#filterReason").value = "";
    refreshUsage();
  });

  await refreshUsage();
}

/* ============================================================
   Page: suppliers
   ============================================================ */
async function refreshSuppliers() {
  const rows = await API.get("/api/suppliers");
  suppliersCache = rows;
  const body = $("#supplierBody");
  if (!rows || !rows.length) {
    body.innerHTML =
      '<tr><td colspan="4" class="empty">No suppliers on file.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (s) => `
    <tr>
      <td><strong>${esc(s.name)}</strong></td>
      <td>${esc(s.contact || "—")}</td>
      <td>${s.category ? `<span class="badge badge--plain">${esc(s.category)}</span>` : "—"}</td>
      <td>
        <div class="actions">
          <button class="btn btn--sm btn--ghost" data-edit="${s.id}">Edit</button>
          <button class="btn btn--sm btn--danger" data-delete="${s.id}">Delete</button>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  $$("[data-edit]", body).forEach((btn) =>
    btn.addEventListener("click", () => {
      const s = rows.find((x) => String(x.id) === btn.dataset.edit);
      if (s) openSupplierForm(s);
    }),
  );
  $$("[data-delete]", body).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const s = rows.find((x) => String(x.id) === btn.dataset.delete);
      const ok = await confirmDialog({
        title: `Delete ${s ? s.name : "supplier"}`,
        message:
          "This removes the supplier from the list. Existing items and deliveries keep their supplier name as a text field.",
        confirmLabel: "Delete",
      });
      if (!ok) return;
      try {
        await API.del(`/api/suppliers/${btn.dataset.delete}`);
        toast("Supplier deleted.", "ok");
        invalidateCaches();
        await refreshSuppliers();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

function openSupplierForm(existing) {
  const isEdit = !!existing;
  openForm({
    title: isEdit ? `Edit supplier · ${existing.name}` : "Add supplier",
    submitLabel: isEdit ? "Save changes" : "Add supplier",
    fields: [
      {
        name: "name",
        label: "Supplier name",
        required: true,
        value: isEdit ? existing.name : "",
        placeholder: "e.g. Bicol Prime Meats",
        full: true,
      },
      {
        name: "contact",
        label: "Contact number",
        value: isEdit ? existing.contact : "",
        placeholder: "0917 200 4411",
      },
      {
        name: "category",
        label: "Category",
        value: isEdit ? existing.category : "",
        placeholder: "Beef, Poultry, Beverage…",
      },
    ],
    onSubmit: async (v) => {
      const payload = {
        name: v.name.trim(),
        contact: v.contact.trim(),
        category: v.category.trim(),
      };
      if (isEdit) await API.put(`/api/suppliers/${existing.id}`, payload);
      else await API.post("/api/suppliers", payload);
      toast(isEdit ? "Supplier updated." : "Supplier added.", "ok");
      invalidateCaches();
      await refreshSuppliers();
    },
  });
}

async function initSuppliers() {
  $("#newSupplier").addEventListener("click", () => openSupplierForm(null));
  await refreshSuppliers();
}

/* ============================================================
   Page: reports
   ============================================================ */
async function runReport() {
  const from = $("#reportFrom").value;
  const to = $("#reportTo").value;

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const rows = await API.get(
    "/api/reports/movement" + (params.toString() ? "?" + params : ""),
  );
  const chart = $("#movementChart");

  if (!rows || !rows.length) {
    chart.innerHTML = '<p class="empty">No movement in this range.</p>';
    return;
  }

  const maxIn = Math.max(1, ...rows.map((r) => r.in));
  const maxOut = Math.max(1, ...rows.map((r) => r.out));
  const max = Math.max(maxIn, maxOut);

  chart.innerHTML = rows
    .map(
      (r) => `
    <div class="movement-row">
      <span class="movement-row__date">${fmtDate(r.date)}</span>
      <div class="movement-bars">
        <div class="movement-bar movement-bar--in">
          <span class="movement-bar__fill" style="width:${(r.in / max) * 100}%"></span>
          <span class="movement-bar__label">${r.in} in</span>
        </div>
        <div class="movement-bar movement-bar--out">
          <span class="movement-bar__fill" style="width:${(r.out / max) * 100}%"></span>
          <span class="movement-bar__label">${r.out} out</span>
        </div>
      </div>
    </div>`,
    )
    .join("");
}

async function initReports() {
  $("#reportTo").value = todayISO();
  $("#reportFrom").value = addDaysISO(todayISO(), -29);
  $("#runReport").addEventListener("click", () =>
    runReport().catch((err) => toast(err.message, "err")),
  );
  await runReport();
}

/* ============================================================
   Bootstrap
   ============================================================ */
const PAGES = {
  dashboard: initDashboard,
  items: initItems,
  deliveries: initDeliveries,
  usage: initUsage,
  suppliers: initSuppliers,
  reports: initReports,
};

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  if (page === "index") {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      const data = res.ok ? await res.json() : null;
      location.replace(data && data.user ? "dashboard.html" : "login.html");
    } catch {
      location.replace("login.html");
    }
    return;
  }

  if (page === "login") {
    initLogin();
    return;
  }

  const user = await requireSession();
  if (!user) return;
  renderShell(user, page);

  const init = PAGES[page];
  if (!init) return;
  try {
    await init(user);
  } catch (err) {
    console.error(err);
    toast(err.message || "Unable to load this page.", "err");
  }
});
