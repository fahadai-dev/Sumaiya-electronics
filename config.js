const SUPABASE_URL = "https://lyzpvejbflcfbsozzjus.supabase.co"; // যেমন: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5enB2ZWpiZmxjZmJzb3p6anVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDA1MTYsImV4cCI6MjA5ODk3NjUxNn0.T7sEKbVZKcpe7Vef2kdSjUma6Xrj6Ezp6wOWfsqXvek"; // Settings → API → "anon public" key

// এই anon key ব্রাউজারে দেখা গেলেও সমস্যা নেই — এটা Supabase-এর ডিজাইন অনুযায়ী
// পাবলিক (RLS পলিসি দিয়ে আসল সুরক্ষা করা হয়েছে schema.sql-এ)

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
