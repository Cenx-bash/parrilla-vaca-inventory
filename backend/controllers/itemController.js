const { db, save, nextId } = require('../database/connection');

function statusOf(item) {
  if (item.quantity <= 0) return 'out';
  if (item.quantity <= item.reorder) return 'low';
  return 'ok';
}

function enrich(item) {
  return {
    ...item,
    status: statusOf(item),
    value: +(item.quantity * item.unit_cost).toFixed(2)
  };
}

exports.list = (req, res) => {
  const { q, category, status } = req.query;
  let rows = db.items.slice();

  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter(i => i.name.toLowerCase().includes(needle));
  }
  if (category) rows = rows.filter(i => i.category === category);
  if (status)   rows = rows.filter(i => statusOf(i) === status);

  rows.sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
  res.json(rows.map(enrich));
};

exports.get = (req, res) => {
  const it = db.items.find(x => x.id === Number(req.params.id));
  if (!it) return res.status(404).json({ error: 'Item not found.' });
  res.json(enrich(it));
};

exports.create = (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Item name is required.' });

  const record = {
    id: nextId('items'),
    name,
    category: String(b.category || 'Other').trim(),
    unit: String(b.unit || 'pcs').trim(),
    quantity: Number(b.quantity) || 0,
    reorder: Number(b.reorder) || 0,
    par: Number(b.par) || 0,
    unit_cost: Number(b.unit_cost) || 0,
    supplier: String(b.supplier || '').trim()
  };
  db.items.push(record);
  save();
  res.status(201).json(enrich(record));
};

exports.update = (req, res) => {
  const it = db.items.find(x => x.id === Number(req.params.id));
  if (!it) return res.status(404).json({ error: 'Item not found.' });
  const b = req.body || {};

  if (b.name      != null) it.name      = String(b.name).trim();
  if (b.category  != null) it.category  = String(b.category).trim();
  if (b.unit      != null) it.unit      = String(b.unit).trim();
  if (b.quantity  != null) it.quantity  = Number(b.quantity);
  if (b.reorder   != null) it.reorder   = Number(b.reorder);
  if (b.par       != null) it.par       = Number(b.par);
  if (b.unit_cost != null) it.unit_cost = Number(b.unit_cost);
  if (b.supplier  != null) it.supplier  = String(b.supplier).trim();

  save();
  res.json(enrich(it));
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  if (!db.items.some(i => i.id === id))
    return res.status(404).json({ error: 'Item not found.' });
  db.items = db.items.filter(i => i.id !== id);
  save();
  res.json({ ok: true });
};