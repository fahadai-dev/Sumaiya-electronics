- ══════════════════════════════════════════════════════════
-- TechZone Electronics Shop — Supabase Database Schema
-- এই পুরো ফাইলটা Supabase Dashboard → SQL Editor-এ পেস্ট করে "RUN" চাপুন
-- ══════════════════════════════════════════════════════════
 
-- ────────────────────────────────────────────
-- 1) SHOPS (multi-tenant ready — ভবিষ্যতে একই সিস্টেম অন্য দোকানেও বসাতে পারবেন)
-- ────────────────────────────────────────────
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);
 
-- ────────────────────────────────────────────
-- 2) PROFILES (auth.users-এর সাথে লিংক — role রাখে: owner / staff)
-- ────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner','staff')) default 'staff',
  created_at timestamptz default now()
);
 
-- ────────────────────────────────────────────
-- 3) PRODUCTS (parent product — ভেরিয়েন্ট ছাড়া common তথ্য)
-- ────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  brand text not null,
  category text default 'অন্যান্য',
  warranty_months int default 0,
  image_url text,
  created_at timestamptz default now()
);
 
-- ────────────────────────────────────────────
-- 4) PRODUCT VARIANTS (একই পণ্যের বিভিন্ন variant — যেমন 128GB/256GB, রঙ ইত্যাদি)
-- ────────────────────────────────────────────
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  variant_name text not null default 'স্ট্যান্ডার্ড',
  serial text,
  buy_price numeric not null default 0,
  sell_price numeric not null default 0,
  stock int not null default 0,
  min_stock int not null default 2,
  unit text default 'পিস',
  warranty_end date,
  created_at timestamptz default now()
);
 
-- ────────────────────────────────────────────
-- 5) CUSTOMERS (খাতা/বাকি সিস্টেমের জন্য)
-- ────────────────────────────────────────────
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  created_at timestamptz default now()
);
 
-- ────────────────────────────────────────────
-- 6) SALES
-- ────────────────────────────────────────────
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  brand text,
  qty int not null default 1,
  sell_price numeric not null,
  buy_price numeric not null,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  pay_type text default 'cash' check (pay_type in ('cash','credit','partial')),
  paid numeric default 0,
  sale_date date not null default current_date,
  sale_time text,
  sold_by uuid references profiles(id),
  created_at timestamptz default now()
);
 
-- ────────────────────────────────────────────
-- 7) CUSTOMER TRANSACTIONS (খাতা লেজার — বাকি/পেমেন্ট/ফেরত)
-- ────────────────────────────────────────────
create table if not exists customer_transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  type text not null check (type in ('sale','payment','return')),
  amount numeric not null,
  paid numeric default 0,
  description text,
  txn_date date not null default current_date,
  created_at timestamptz default now()
);
 
-- ────────────────────────────────────────────
-- 8) SERVICE / REPAIR LOG
-- ────────────────────────────────────────────
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  product_name text not null,
  serial text,
  type text default 'repair' check (type in ('repair','warranty','maintenance')),
  status text default 'pending' check (status in ('pending','complete')),
  customer_name text,
  charge numeric default 0,
  description text,
  service_date date not null default current_date,
  created_at timestamptz default now()
);
 
-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — শুধু নিজের দোকানের ডেটা দেখা/বদলানো যাবে
-- ══════════════════════════════════════════════════════════
alter table shops enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table customer_transactions enable row level security;
alter table services enable row level security;
 
-- Helper function: বর্তমান লগইন করা ব্যবহারকারীর shop_id বের করা
create or replace function my_shop_id()
returns uuid
language sql stable
as $$
  select shop_id from profiles where id = auth.uid()
$$;
 
-- Helper function: বর্তমান ব্যবহারকারী owner কিনা চেক করা
create or replace function is_owner()
returns boolean
language sql stable
as $$
  select role = 'owner' from profiles where id = auth.uid()
$$;
 
-- PROFILES: নিজের shop-এর সব profile দেখা যাবে, শুধু owner insert/update/delete করতে পারবে অন্যদেরটা
create policy "profiles_select" on profiles for select
  using (shop_id = my_shop_id());
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid() or is_owner());
 
-- PRODUCTS
create policy "products_all" on products for all
  using (shop_id = my_shop_id()) with check (shop_id = my_shop_id());
 
-- VARIANTS
create policy "variants_all" on product_variants for all
  using (shop_id = my_shop_id()) with check (shop_id = my_shop_id());
 
-- CUSTOMERS
create policy "customers_all" on customers for all
  using (shop_id = my_shop_id()) with check (shop_id = my_shop_id());
 
-- SALES
create policy "sales_all" on sales for all
  using (shop_id = my_shop_id()) with check (shop_id = my_shop_id());
 
-- CUSTOMER TRANSACTIONS
create policy "txns_all" on customer_transactions for all
  using (shop_id = my_shop_id()) with check (shop_id = my_shop_id());
 
-- SERVICES
create policy "services_all" on services for all
  using (shop_id = my_shop_id()) with check (shop_id = my_shop_id());
 
-- SHOPS: শুধু নিজের shop দেখা যাবে
create policy "shops_select" on shops for select
  using (id = my_shop_id());
 
-- ══════════════════════════════════════════════════════════
-- SETUP: প্রথম দোকান আর মালিক তৈরি করা (এই অংশ একবারই চালাবেন)
-- ══════════════════════════════════════════════════════════
-- ধাপ ১: প্রথমে Supabase Dashboard → Authentication → Users → "Add User"
--         দিয়ে মালিকের email/password দিয়ে একটা ইউজার বানান, তারপর তার UUID কপি করুন
-- ধাপ ২: নিচের কমান্ড দুইটাতে 'আপনার-দোকানের-নাম' আর 'MALIK-UUID-HERE' বসিয়ে রান করুন
 
-- insert into shops (id, name) values (gen_random_uuid(), 'TechZone Electronics') returning id;
-- (উপরের কমান্ড থেকে যে shop id পাবেন সেটা নিচে বসান)
 
-- insert into profiles (id, shop_id, full_name, role)
-- values ('MALIK-UUID-HERE', 'SHOP-ID-HERE', 'দোকান মালিক', 'owner');