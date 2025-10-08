import { redirect, type LoaderFunctionArgs } from "react-router";

/**
 * Short URL redirect for wallet status
 * Redirects /w/:address to /app/wallet-status/:address
 *
 * This is used in NFT asset URLs to stay within Algorand's 96-character limit
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { address } = params;

  if (!address) {
    return redirect("/app/wallet-status");
  }

  return redirect(`/app/wallet-status/${address}`);
}
