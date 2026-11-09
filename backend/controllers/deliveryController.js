
const { db, save, nextId } = require('../database/connection');

function applyStock(item, qty) {
  item.quantity = +(item.quantity + qty).toFixed(4);
}

exports.list = (req, res) => {
  const { from, to, item_id } = req.query;
  let rows = db.deliveries.slice();
  if (from)    rows = rows.filter(d => d.date >= from);
  if (to)      rows = rows.filter(d => d.date <= to);
  if (item_id) rows = rows.filter(d => d.item_id === Number(item_id));
  rows.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  res.json(rows);
};

exports.create = (req, res) => {
  const b = req.body || {};
  const item = db.items.find(i => i.id === Number(b.item_id));
  if (!item) return res.status(400).json({ error: 'Item not found.' });

  const qty = Number(b.quantity);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0.' });

  const unitCost = Number(b.unit_cost) || item.unit_cost || 0;

  const record = {
    id: nextId('deliveries'),
    item_id: item.id,
    item_name: item.name,
    quantity: qty,
    unit_cost: unitCost,
    total: +(qty * unitCost).toFixed(2),
    supplier: String(b.supplier || item.supplier || '').trim(),
    invoice: String(b.invoice || '').trim(),
    received_by: String(b.received_by || req.session.user.full_name).trim(),
    date: b.date || new Date().toISOString().slice(0, 10),
    notes: String(b.notes || '').trim()
  };

  // Update item's unit cost if it changed
  if (unitCost > 0 && unitCost !== item.unit_cost) item.unit_cost = unitCost;

  applyStock(item, qty);

  db.deliveries.push(record);
  save();
  res.status(201).json(record);
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  const d = db.deliveries.find(x => x.id === id);
  if (!d) return res.status(404).json({ error: 'Delivery not found.' });

  const item = db.items.find(i => i.id === d.item_id);
  if (item) item.quantity = +(item.quantity - d.quantity).toFixed(4);

  db.deliveries = db.deliveries.filter(x => x.id !== id);
  save();
  res.json({ ok: true });
};