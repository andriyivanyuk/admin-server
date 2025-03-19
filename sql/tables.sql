
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    token_expires TIMESTAMP
);

ALTER TABLE users
ADD COLUMN role TEXT NOT NULL DEFAULT 'client';

UPDATE users
SET role = 'superadmin'
WHERE email = 'andriyivvanyuk@gmail.com';

CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE Statuses (
    status_id SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL
);

INSERT INTO Statuses (status_name) VALUES ('Активний'), ('Неактивний'), ('Немає на складі');


CREATE TABLE Products (
    product_code VARCHAR(6) UNIQUE,
    product_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL NOT NULL,
    stock INTEGER NOT NULL,
    category_id INTEGER NOT NULL REFERENCES Categories(category_id) ON DELETE CASCADE,
    created_by_user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    status_id INTEGER REFERENCES Statuses(status_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Product_Attributes (
    attribute_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES Products(product_id) ON DELETE CASCADE,
    attribute_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Attribute_Values (
    value_id SERIAL PRIMARY KEY,
    attribute_id INTEGER NOT NULL REFERENCES Product_Attributes(attribute_id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Product_Images (
    image_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES Products(product_id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, image_path)
);  

CREATE UNIQUE INDEX idx_product_attribute_unique ON Product_Attributes (product_id, attribute_key)


CREATE TABLE Customers (
    customer_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255)
);

CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES Customers(customer_id) ON DELETE CASCADE,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_id INTEGER NOT NULL REFERENCES OrderStatuses(status_id) ON DELETE SET NULL,
    comment TEXT,              -- нове поле для збереження коментаря замовлення
    delivery_method VARCHAR(255)  -- нове поле для збереження способу доставки
);

CREATE TABLE OrderStatuses (
    status_id SERIAL PRIMARY KEY,
    status_name VARCHAR(255) NOT NULL
);


INSERT INTO OrderStatuses (status_name) VALUES 
('Новий'), 
('В обробці'), 
('Готове до відправки'), 
('Відправлено'), 
('Доставлено'), 
('Скасовано');


CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
);

CREATE TABLE registration_codes (
  code TEXT PRIMARY KEY,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
-- TRUNCATE TABLE orders RESTART IDENTITY CASCADE; clear data from table but table
-- DELETE FROM users
-- WHERE role = 'client';

-- Прискорення пошуку атрибутів за product_id
CREATE INDEX idx_product_attributes_product_id ON product_attributes(product_id);

-- Прискорення пошуку значень атрибутів за attribute_id
CREATE INDEX idx_attribute_values_attribute_id ON attribute_values(attribute_id);

-- Прискорення операцій над значеннями атрибутів
CREATE INDEX idx_attribute_values_value ON attribute_values(value);

-- Прискорення пошуку зображень за product_id
CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- Прискорення пошуку продуктів за product_id (запобігає Full Table Scan)
CREATE INDEX idx_products_product_id ON products(product_id);

-- Прискорення зв'язків статусів
CREATE INDEX idx_products_status_id ON products(status_id);

-- Прискорення пошуку категорій
CREATE INDEX idx_products_category_id ON products(category_id);

