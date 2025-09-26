import type { ActionFunctionArgs } from "react-router";
export async function action({ request }: ActionFunctionArgs) {
  const payload = await request.json();
  try {
    const appId = import.meta.env.VITE_WORLDCOIN_APP_ID;
    const { proof, merkle_root, nullifier_hash, verification_level } = payload;

    const url = "https://developer.worldcoin.org/api/v2/verify/" + appId;
    const verifyRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nullifier_hash,
        merkle_root,
        proof,
        verification_level,
        action: "age-verification-over-18",
      }),
    });

    if (verifyRes.ok) {
      const res = await verifyRes.json();
      if (res.success) {
        // Store nullifier_hash to prevent reuse
        // Grant access to user
        return { ok: true };
      } else {
        throw new Response("Invalid proof", { status: 400 });
      }
    } else {
      throw new Response("Verification failed", { status: 400 });
    }
  } catch (error) {
    throw new Response("Unknown verification error", { status: 500 });
  }
}

export async function loader() {
  const data = {};
  return { id: data };
}
