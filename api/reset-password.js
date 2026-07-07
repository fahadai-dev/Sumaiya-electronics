// ══════════════════════════════════════════════════════════
// /api/reset-password — শুধু OWNER এই ফাংশন কল করতে পারবে
// যেকোনো staff-এর পাসওয়ার্ড রিসেট করতে পারবে (নিজে লগইন না করেই)
// ══════════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");

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

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      return res.status(401).json({ error: "অবৈধ session" });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "owner") {
      return res
        .status(403)
        .json({ error: "শুধু মালিক (Owner) পাসওয়ার্ড পরিবর্তন করতে পারবেন" });
    }

    const { target_user_id, new_password } = req.body;
    if (!target_user_id || !new_password) {
      return res
        .status(400)
        .json({ error: "কার পাসওয়ার্ড বদলাবেন এবং নতুন পাসওয়ার্ড দিন" });
    }
    if (new_password.length < 6) {
      return res
        .status(400)
        .json({ error: "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে" });
    }

    // নিশ্চিত করি যে target user একই দোকানের staff, অন্য দোকানের কেউ না
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("shop_id")
      .eq("id", target_user_id)
      .single();

    if (!targetProfile || targetProfile.shop_id !== profile.shop_id) {
      return res.status(403).json({ error: "এই ইউজার আপনার দোকানের না" });
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
        password: new_password,
      });
    if (updateError)
      return res.status(400).json({ error: updateError.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "সার্ভার সমস্যা: " + err.message });
  }
};
