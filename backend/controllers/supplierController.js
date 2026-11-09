const { db, save, nextId } = require('../database/connection');

exports.list = (req, res) => {
  const rows = db.suppliers.slice().sort((a, b) => a.name.localeCompare(b.name));
  res.json(rows);
};

exports.create = (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });
  const record = {
    id: nextId('suppliers'),
    name,
    contact: String(b.contact || '').trim(),
    category: String(b.category || '').trim()
  };
  db.suppliers.push(record);
  save();
  res.status(201).json(record);
};

exports.update = (req, res) => {
  const s = db.suppliers.find(x => x.id === Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Supplier not found.' });
  const b = req.body || {};
  if (b.name     != null) s.name     = String(b.name).trim();
  if (b.contact  != null) s.contact  = String(b.contact).trim();
  if (b.category != null) s.category = String(b.category).trim();
  save();
  res.json(s);
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  if (!db.suppliers.some(s => s.id === id))
    return res.status(404).json({ error: 'Supplier not found.' });
  db.suppliers = db.suppliers.filter(s => s.id !== id);
  save();
  res.json({ ok: true });
};