import { createClient } from "./supabase/server";

export type MembershipTier = "free" | "alliance" | "admin";

export type MembershipProfile = {
  id: string;
  email: string | null;
  artist_name: string | null;
  shop_name: string | null;
  membership_tier: MembershipTier | null;
  subscription_status: string | null;
};

export async function getMembership() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      membershipTier: "free" as MembershipTier,
      isLoggedIn: false,
      isAlliance: false,
      isAdmin: false,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, email, artist_name, shop_name, membership_tier, subscription_status"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      user,
      profile: null,
      membershipTier: "free" as MembershipTier,
      isLoggedIn: true,
      isAlliance: false,
      isAdmin: false,
    };
  }

  const membershipTier =
    (profile.membership_tier as MembershipTier | null) || "free";

  return {
    user,
    profile: profile as MembershipProfile,
    membershipTier,
    isLoggedIn: true,
    isAlliance: membershipTier === "alliance" || membershipTier === "admin",
    isAdmin: membershipTier === "admin",
  };
}