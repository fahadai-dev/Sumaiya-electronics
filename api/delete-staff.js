// ══════════════════════════════════════════════════════════
// /api/delete-staff — শুধু OWNER একটা staff account মুছে ফেলতে পারবে
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "owner") {
      return res
        .status(403)
        .json({ error: "শুধু মালিক (Owner) স্টাফ মুছতে পারবেন" });
    }

    const { target_user_id } = req.body;
    if (!target_user_id)
      return res.status(400).json({ error: "কার একাউন্ট মুছবেন তা দিন" });
    if (target_user_id === user.id)
      return res
        .status(400)
        .json({ error: "নিজের একাউন্ট এভাবে মুছা যাবে না" });

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("shop_id")
      .eq("id", target_user_id)
      .single();
    if (!targetProfile || targetProfile.shop_id !== profile.shop_id) {
      return res.status(403).json({ error: "এই ইউজার আপনার দোকানের না" });
    }

    await supabaseAdmin.from("profiles").delete().eq("id", target_user_id);
    const { error: delError } =
      await supabaseAdmin.auth.admin.deleteUser(target_user_id);
    if (delError) return res.status(400).json({ error: delError.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "সার্ভার সমস্যা: " + err.message });
  }
};
