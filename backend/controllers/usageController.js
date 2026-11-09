const { db, save, nextId } = require('../database/connection');

const REASONS = ['kitchen_prep', 'wastage', 'spoilage', 'staff_meal', 'transfer'];

exports.list = (req, res) => {
  const { from, to, item_id, reason } = req.query;
  let rows = db.usage.slice();
  if (from)   rows = rows.filter(u => u.date >= from);
  if (to)     rows = rows.filter(u => u.date <= to);
  if (item_id) rows = rows.filter(u => u.item_id === Number(item_id));
  if (reason)  rows = rows.filter(u => u.reason === reason);
  rows.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  res.json(rows);
};

exports.create = (req, res) => {
  const b = req.body || {};
  const item = db.items.find(i => i.id === Number(b.item_id));
  if (!item) return res.status(400).json({ error: 'Item not found.' });

  const qty = Number(b.quantity);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0.' });
  if (qty > item.quantity) return res.status(400).json({ error: `Only ${item.quantity} ${item.unit} in stock.` });

  const reason = REASONS.includes(b.reason) ? b.reason : 'kitchen_prep';

  const record = {
    id: nextId('usage'),
    item_id: item.id,
    item_name: item.name,
    quantity: qty,
    reason,
    recorded_by: String(b.recorded_by || req.session.user.full_name).trim(),
    date: b.date || new Date().toISOString().slice(0, 10),
    notes: String(b.notes || '').trim()
  };

  item.quantity = +(item.quantity - qty).toFixed(4);

  db.usage.push(record);
  save();
  res.status(201).json(record);
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  const u = db.usage.find(x => x.id === id);
  if (!u) return res.status(404).json({ error: 'Usage entry not found.' });

  const item = db.items.find(i => i.id === u.item_id);
  if (item) item.quantity = +(item.quantity + u.quantity).toFixed(4);

  db.usage = db.usage.filter(x => x.id !== id);
  save();
  res.json({ ok: true });
};