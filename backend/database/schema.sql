CREATE TABLE
    users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff'
    );

CREATE TABLE
    suppliers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        category TEXT
    );

CREATE TABLE
    items (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        reorder REAL NOT NULL DEFAULT 0,
        par REAL NOT NULL DEFAULT 0,
        unit_cost REAL NOT NULL DEFAULT 0,
        supplier TEXT
    );

CREATE TABLE
    deliveries (
        id INTEGER PRIMARY KEY,
        item_id INTEGER REFERENCES items (id),
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost REAL NOT NULL,
        total REAL NOT NULL,
        supplier TEXT,
        invoice TEXT,
        received_by TEXT,
        date TEXT NOT NULL,
        notes TEXT
    );

CREATE TABLE
    usage (
        id INTEGER PRIMARY KEY,
        item_id INTEGER REFERENCES items (id),
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        reason TEXT NOT NULL, -- kitchen_prep | wastage | spoilage | staff_meal | transfer
        recorded_by TEXT,
        date TEXT NOT NULL,
        notes TEXT
    );

CREATE INDEX idx_items_cat ON items (category);

CREATE INDEX idx_del_date ON deliveries (date);

CREATE INDEX idx_use_date ON usage (date);