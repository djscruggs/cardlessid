export async function action({ req, res }: any) {
  const payload = await req.json();
  const { proof, merkle_root, nullifier_hash, verification_level } = req.body;

  console.log(payload);

  try {
    const appId = process.env.WORLDCOIN_APP_ID;
    const verifyRes = await fetch(
      "https://developer.worldcoin.org/api/v1/verify/" + appId,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nullifier_hash,
          merkle_root,
          proof,
          verification_level,
          action: "age-verification-over-18",
        }),
      }
    );

    if (verifyRes.ok) {
      const { verified } = await verifyRes.json();
      if (verified) {
        // Store nullifier_hash to prevent reuse
        // Grant access to user
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Invalid proof" });
      }
    } else {
      res.status(400).json({ error: "Verification failed" });
    }
  } catch (error) {
    res.status(500).json({ error: "Verification error" });
  }
  return { ok: true };
}

export async function loader({ req }: any) {
  const data = {};
  return { id: data };
}
