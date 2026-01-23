-- 1. Create the customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index on phone for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 3. Migrate existing distinct phones from conversations
-- We pick the most recently updated conversation for name/company info
INSERT INTO customers (name, phone, company, created_at, updated_at)
SELECT 
    DISTINCT ON (phone) 
    name, 
    phone, 
    company, 
    created_at, 
    updated_at
FROM conversations
WHERE phone IS NOT NULL AND phone != '' -- Exclude invalid phones
  AND (priority != 'deleted' OR priority IS NULL) -- Exclude deleted
  AND NOT (name ILIKE '[DELETED]%') -- Exclude deleted by name prefix
ORDER BY phone, updated_at DESC
ON CONFLICT (phone) DO UPDATE 
SET 
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    updated_at = NOW();

-- 4. Verify count
SELECT count(*) as total_customers FROM customers;
