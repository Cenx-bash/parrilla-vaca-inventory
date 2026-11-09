const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

const blank = () => ({
  users: [], items: [], suppliers: [], deliveries: [], usage: [],
  nextIds: { users: 1, items: 1, suppliers: 1, deliveries: 1, usage: 1 }
});

let db = blank();

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      db = { ...blank(), ...parsed };
      db.nextIds = { ...blank().nextIds, ...(parsed.nextIds || {}) };
    }
  } catch (e) {
    console.error('[db] load failed:', e.message);
  }
}

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('[db] save failed:', e.message);
  }
}

function nextId(key) {
  const id = db.nextIds[key] || 1;
  db.nextIds[key] = id + 1;
  return id;
}

function seed() {
  db.users = [
    { id: nextId('users'), username: 'admin', password: 'admin123', full_name: 'Restaurant Manager', role: 'admin' },
    { id: nextId('users'), username: 'staff', password: 'staff123', full_name: 'Kitchen Staff',      role: 'staff' }
  ];

  const seedSuppliers = [
    { name: 'Bicol Prime Meats',  contact: '0917 200 4411', category: 'Beef' },
    { name: 'Naga Fresh Poultry', contact: '0918 300 5522', category: 'Poultry' },
    { name: 'San Miguel Depot',   contact: '0917 400 6633', category: 'Beverage' },
    { name: 'Metro Dry Goods',    contact: '0917 500 7744', category: 'Dry Goods' }
  ];
  db.suppliers = seedSuppliers.map(s => ({ id: nextId('suppliers'), ...s }));

  // Items derived from the menu in the photos
  const seedItems = [
    // Beef — from MAIN COURSE
    { name: 'Ribeye Steak (250g cut)',   category: 'Beef',      unit: 'kg', quantity: 4.2,  reorder: 3,   par: 8,  unit_cost: 1650, supplier: 'Bicol Prime Meats' },
    { name: 'Tenderloin Steak',          category: 'Beef',      unit: 'kg', quantity: 2.1,  reorder: 2,   par: 6,  unit_cost: 1580, supplier: 'Bicol Prime Meats' },
    { name: 'Wagyu Cubes',               category: 'Beef',      unit: 'kg', quantity: 1.4,  reorder: 2,   par: 4,  unit_cost: 2420, supplier: 'Bicol Prime Meats' },
    { name: 'T-Bone Steak',              category: 'Beef',      unit: 'kg', quantity: 3.6,  reorder: 2,   par: 6,  unit_cost: 1390, supplier: 'Bicol Prime Meats' },
    { name: 'Porterhouse Steak',         category: 'Beef',      unit: 'kg', quantity: 0.9,  reorder: 2,   par: 5,  unit_cost: 1825, supplier: 'Bicol Prime Meats' },
    { name: 'Fillet Mignon',             category: 'Beef',      unit: 'kg', quantity: 2.4,  reorder: 2,   par: 5,  unit_cost: 1980, supplier: 'Bicol Prime Meats' },
    { name: 'Ribeye USDA (Choice)',      category: 'Beef',      unit: 'kg', quantity: 5.8,  reorder: 3,   par: 8,  unit_cost: 1560, supplier: 'Bicol Prime Meats' },
    { name: 'Beef Kebab trim',           category: 'Beef',      unit: 'kg', quantity: 3.1,  reorder: 2,   par: 5,  unit_cost: 620,  supplier: 'Bicol Prime Meats' },

    // Poultry
    { name: 'Chicken (whole)',           category: 'Poultry',   unit: 'kg', quantity: 6.8,  reorder: 4,   par: 12, unit_cost: 190,  supplier: 'Naga Fresh Poultry' },
    { name: 'Chicken Kebab trim',        category: 'Poultry',   unit: 'kg', quantity: 2.2,  reorder: 2,   par: 5,  unit_cost: 210,  supplier: 'Naga Fresh Poultry' },

    // Seafood
    { name: 'Salmon Fillet',             category: 'Seafood',   unit: 'kg', quantity: 1.6,  reorder: 2,   par: 4,  unit_cost: 980,  supplier: 'Naga Fresh Poultry' },
    { name: 'Cream Dory Fillet',         category: 'Seafood',   unit: 'kg', quantity: 2.9,  reorder: 2,   par: 4,  unit_cost: 340,  supplier: 'Naga Fresh Poultry' },

    // Produce
    { name: 'Mixed Vegetables',          category: 'Produce',   unit: 'kg', quantity: 7.4,  reorder: 3,   par: 8,  unit_cost: 120,  supplier: 'Metro Dry Goods' },
    { name: 'Potatoes',                  category: 'Produce',   unit: 'kg', quantity: 12.0, reorder: 5,   par: 15, unit_cost: 85,   supplier: 'Metro Dry Goods' },
    { name: 'Garlic',                    category: 'Produce',   unit: 'kg', quantity: 0.6,  reorder: 1,   par: 2,  unit_cost: 140,  supplier: 'Metro Dry Goods' },
    { name: 'Onions',                    category: 'Produce',   unit: 'kg', quantity: 3.1,  reorder: 1.5, par: 4,  unit_cost: 95,   supplier: 'Metro Dry Goods' },

    // Dry goods
    { name: 'Jasmine Rice',              category: 'Dry Goods', unit: 'kg', quantity: 22.0, reorder: 10,  par: 30, unit_cost: 62,   supplier: 'Metro Dry Goods' },
    { name: 'Pilaf Rice',                category: 'Dry Goods', unit: 'kg', quantity: 6.5,  reorder: 4,   par: 10, unit_cost: 78,   supplier: 'Metro Dry Goods' },
    { name: 'Penne / Pasta',             category: 'Dry Goods', unit: 'kg', quantity: 4.1,  reorder: 3,   par: 6,  unit_cost: 110,  supplier: 'Metro Dry Goods' },
    { name: 'Burger Buns',               category: 'Dry Goods', unit: 'pcs', quantity: 34,  reorder: 24,  par: 60, unit_cost: 18,   supplier: 'Metro Dry Goods' },
    { name: 'Sandwich Bread',            category: 'Dry Goods', unit: 'pcs', quantity: 12,  reorder: 20,  par: 40, unit_cost: 65,   supplier: 'Metro Dry Goods' },
    { name: 'Nacho Chips',               category: 'Dry Goods', unit: 'kg', quantity: 2.4,  reorder: 2,   par: 4,  unit_cost: 180,  supplier: 'Metro Dry Goods' },

    // Sauces & condiments
    { name: 'Olive Oil',                 category: 'Dry Goods', unit: 'L',  quantity: 2.1,  reorder: 1.5, par: 3,  unit_cost: 420,  supplier: 'Metro Dry Goods' },
    { name: 'Aglio Olio base',           category: 'Dry Goods', unit: 'L',  quantity: 0.8,  reorder: 1,   par: 2,  unit_cost: 380,  supplier: 'Metro Dry Goods' },
    { name: 'Carbonara sauce',           category: 'Dry Goods', unit: 'L',  quantity: 1.4,  reorder: 1,   par: 2,  unit_cost: 450,  supplier: 'Metro Dry Goods' },
    { name: 'Pesto sauce',               category: 'Dry Goods', unit: 'L',  quantity: 0.5,  reorder: 1,   par: 2,  unit_cost: 520,  supplier: 'Metro Dry Goods' },
    { name: 'Gravy (brown sauce)',       category: 'Dry Goods', unit: 'L',  quantity: 3.2,  reorder: 2,   par: 4,  unit_cost: 210,  supplier: 'Metro Dry Goods' },

    // Beverage
    { name: 'San Miguel Light',          category: 'Beverage',  unit: 'bottle', quantity: 48, reorder: 24, par: 72, unit_cost: 78,  supplier: 'San Miguel Depot' },
    { name: 'San Mig Apple',             category: 'Beverage',  unit: 'bottle', quantity: 22, reorder: 24, par: 48, unit_cost: 82,  supplier: 'San Miguel Depot' },
    { name: 'San Mig Pilsen',            category: 'Beverage',  unit: 'bottle', quantity: 60, reorder: 36, par: 96, unit_cost: 72,  supplier: 'San Miguel Depot' },
    { name: 'Coke Regular (in can)',     category: 'Beverage',  unit: 'can',    quantity: 40, reorder: 24, par: 60, unit_cost: 45,  supplier: 'San Miguel Depot' },
    { name: 'Coke Zero',                 category: 'Beverage',  unit: 'can',    quantity: 18, reorder: 24, par: 60, unit_cost: 45,  supplier: 'San Miguel Depot' },
    { name: 'Iced Tea (pitcher)',        category: 'Beverage',  unit: 'L',      quantity: 4.0, reorder: 2, par: 6,  unit_cost: 55,  supplier: 'San Miguel Depot' },
    { name: 'Bottled Water (500ml)',     category: 'Beverage',  unit: 'bottle', quantity: 72, reorder: 36, par: 96, unit_cost: 14,  supplier: 'San Miguel Depot' },

    // Dessert
    { name: 'Brownie base',              category: 'Dessert',   unit: 'kg', quantity: 1.8,  reorder: 1,   par: 3,  unit_cost: 340,  supplier: 'Metro Dry Goods' },
    { name: 'Vanilla ice cream',         category: 'Dessert',   unit: 'L',  quantity: 2.4,  reorder: 2,   par: 4,  unit_cost: 280,  supplier: 'Metro Dry Goods' }
  ];
  db.items = seedItems.map(it => ({ id: nextId('items'), ...it }));

  // Sample delivery + usage so the dashboard isn't empty
  const today = new Date().toISOString().slice(0, 10);
  db.deliveries = [
    {
      id: nextId('deliveries'),
      item_id: 1, item_name: 'Ribeye Steak (250g cut)',
      quantity: 5, unit_cost: 1650, total: 8250,
      supplier: 'Bicol Prime Meats', invoice: 'BPM-1042',
      received_by: 'Restaurant Manager', date: today, notes: ''
    },
    {
      id: nextId('deliveries'),
      item_id: 27, item_name: 'San Miguel Light',
      quantity: 48, unit_cost: 78, total: 3744,
      supplier: 'San Miguel Depot', invoice: 'SMD-88213',
      received_by: 'Restaurant Manager', date: today, notes: ''
    }
  ];

  db.usage = [
    {
      id: nextId('usage'),
      item_id: 1, item_name: 'Ribeye Steak (250g cut)',
      quantity: 0.8, reason: 'kitchen_prep',
      recorded_by: 'Kitchen Staff', date: today, notes: 'Dinner service'
    },
    {
      id: nextId('usage'),
      item_id: 9, item_name: 'Chicken (whole)',
      quantity: 2.4, reason: 'kitchen_prep',
      recorded_by: 'Kitchen Staff', date: today, notes: 'Chicken kebab prep'
    }
  ];

  save();
}

load();
if (!db.users.length) seed();

module.exports = { db, save, nextId };