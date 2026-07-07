// ══════════════════════════════════════════════════════════
// /api/create-staff — শুধু OWNER এই ফাংশন কল করতে পারবে
// নতুন staff account তৈরি করে (Supabase Auth + profiles table)
// ══════════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");

// ⚠️ এই দুইটা Vercel Dashboard → Settings → Environment Variables-এ বসাবেন
// SUPABASE_URL এবং SUPABASE_SERVICE_ROLE_KEY (কখনো ক্লায়েন্ট কোডে বসাবেন না!)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token)
      return res.status(401).json({ error: "কোনো টোকেন পাওয়া যায়নি" });

    // ধাপ ১: টোকেন দিয়ে যাচাই করি কে রিকোয়েস্ট পাঠাচ্ছে
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      return res.status(401).json({ error: "অবৈধ session" });

    // ধাপ ২: সে owner কিনা চেক করি
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "owner") {
      return res
        .status(403)
        .json({ error: "শুধু মালিক (Owner) নতুন স্টাফ তৈরি করতে পারবেন" });
    }

    // ধাপ ৩: body থেকে নতুন staff-এর তথ্য নিই
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: "নাম, ইমেইল ও পাসওয়ার্ড দিন" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে" });
    }

    // ধাপ ৪: নতুন auth user বানাই
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError)
      return res.status(400).json({ error: createError.message });

    // ধাপ ৫: profiles টেবিলে staff হিসেবে যোগ করি, একই দোকানের shop_id দিয়ে
    const { error: insertError } = await supabaseAdmin.from("profiles").insert({
      id: newUser.user.id,
      shop_id: profile.shop_id,
      full_name,
      role: "staff",
    });
    if (insertError)
      return res.status(400).json({ error: insertError.message });

    return res.status(200).json({ success: true, user_id: newUser.user.id });
  } catch (err) {
    return res.status(500).json({ error: "সার্ভার সমস্যা: " + err.message });
  }
};
