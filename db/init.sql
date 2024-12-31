DO $$
BEGIN
    -- Check if the database already exists
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'esi_market') THEN
        RAISE NOTICE 'Creating database esi_market';
        CREATE DATABASE esi_market;
    ELSE
        RAISE NOTICE 'Database esi_market already exists';
    END IF;
END $$;

-- \c esi_market --connect to DB esi_market

-- Market Price Table Creation
CREATE TABLE IF NOT EXISTS market_price(
    order_id BIGINT PRIMARY KEY,
    type_id INT NOT NULL,
    is_buy_order BOOLEAN NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    volume_remain INT NOT NULL,
    region_id BIGINT NOT NULL,
    system_id BIGINT NOT NULL,
    location_id BIGINT NOT NULL,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Add unique constraint on type_id and is_buy_order
ALTER TABLE market_price ADD CONSTRAINT unique_typeid_is_buy_order UNIQUE (type_id, is_buy_order);

-- Type Info Table Creation
CREATE TABLE IF NOT EXISTS type_info (
    type_id INT PRIMARY KEY,
    name_en TEXT,
    name_ko TEXT,
    volume FLOAT,
    packaged_volume FLOAT,
    icon_id INT,
    icon_type TEXT,
    group_id INT,
    published BOOLEAN,
    market_group_id INT
);
-- Adding indexes on name columns
CREATE INDEX idx_name_en ON type_info (name_en);
CREATE INDEX idx_name_ko ON type_info (name_ko);

-- Industry Relation Table Creation
CREATE TABLE IF NOT EXISTS industry_relation (
    idx SERIAL PRIMARY KEY,
    output_id INT NOT NULL,
    output_amount INT NOT NULL,
    input_id INT NOT NULL,
    input_amount INT NOT NULL,
    industry_type INT NOT NULL,
    recipe_id INT NOT NULL,
    CONSTRAINT unique_client_service UNIQUE (output_id, input_id, recipe_id)
);
-- Adding indexes on output_id, input_id, and recipe_id
CREATE INDEX IF NOT EXISTS idx_output_id ON industry_relation (output_id);
CREATE INDEX IF NOT EXISTS idx_input_id ON industry_relation (input_id);
CREATE INDEX IF NOT EXISTS idx_recipe_id ON industry_relation (recipe_id);


-- Stock management table
CREATE TABLE IF NOT EXISTS industry_stock (
    type_id INT NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    median_amount BIGINT NOT NULL DEFAULT 0,
    max_amount BIGINT NOT NULL DEFAULT 0,
    name_en TEXT,
    UNIQUE (type_id)
);

-- Buyback contract record
CREATE TABLE IF NOT EXISTS buyback_contract_log (
    contract_id INT NOT NULL,
    charcater_id BIGINT NOT NULL,
    character_name VARCHAR(255) NOT NULL,
    type_id INT NOT NULL,
    name_en TEXT,
    amount BIGINT NOT NULL,
    buyprice DECIMAL(18,2) NOT NULL,
    total_price DECIMAL(18,2) NOT NULL,
    price_rate DECIMAL(10,8) NOT NULL,
    is_input BOOLEAN NOT NULL DEFAULT TRUE,
    registered_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE

);

-- OAuth Client Table Creation
CREATE TABLE IF NOT EXISTS sso_client (
    idx SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    client_service VARCHAR(255) NOT NULL,
    scope TEXT NOT NULL,
    -- Unique constraint on client_id
    CONSTRAINT unique_client_id UNIQUE (client_id),
    -- Unique constraint on client_service
    CONSTRAINT unique_client_service UNIQUE (client_service)
);
-- Adding indexes for faster lookup on client_id and client_service
CREATE INDEX IF NOT EXISTS idx_client_id ON sso_client (client_id);
CREATE INDEX IF NOT EXISTS idx_client_service ON sso_client (client_service);



-- User Info Table Creation
CREATE TABLE IF NOT EXISTS user_info (
    idx SERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL,
    character_name VARCHAR(255) NOT NULL,
    main_id BIGINT,
    main_name VARCHAR(255),
    corp_id BIGINT,
    corp_ticker CHAR(20),
    alliance_id BIGINT,
    alliance_ticker CHAR(20),
    birthday DATE,
    registered_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    -- Unique constraint on character_id
    CONSTRAINT unique_character_id UNIQUE (character_id),
    -- Unique constraint on character_name
    CONSTRAINT unique_character_name UNIQUE (character_name)
);
-- Adding index for character_id and character_name for faster lookup
CREATE INDEX IF NOT EXISTS idx_character_id ON user_info (character_id);
CREATE INDEX IF NOT EXISTS idx_character_name ON user_info (character_name);



-- User OAuth Table Creation
CREATE TABLE IF NOT EXISTS user_oauth (
    character_id BIGINT NOT NULL,
    client_service VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_character_client UNIQUE (character_id, client_service)
);


-- Login Log Table Creation
CREATE TABLE IF NOT EXISTS login_log (
    uidx INT REFERENCES user_info(idx),
    logintime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    character_id BIGINT,
    login_ip VARCHAR(15),
    PRIMARY KEY (logintime, character_id) -- Log multiple attempts per character
);