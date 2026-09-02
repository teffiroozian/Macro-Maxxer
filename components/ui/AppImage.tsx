import Image, { type ImageProps } from "next/image";
import { CHIPOTLE_IMAGE_REMOTE_HOSTS } from "@/data/restaurants/chipotle-generated-presentation";

const UNOPTIMIZED_REMOTE_HOSTS = new Set<string>(CHIPOTLE_IMAGE_REMOTE_HOSTS);

function isUnoptimizedRemoteImage(src: ImageProps["src"]): boolean {
  if (typeof src !== "string") return false;
  try {
    return UNOPTIMIZED_REMOTE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

// Next's server-side image optimizer proxies every remote next/image
// through /_next/image, which re-resolves the hostname itself and rejects
// the request if that lookup returns a private/NAT64 address (observed in
// DNS64 network environments) — even though the source URL and the app's
// own images.remotePatterns allowlist (next.config.ts) are both correct.
// Chipotle's official CDN hosts hit this in practice, so their images skip
// the optimizer and load directly in the browser instead; every other
// image (including every other restaurant's) keeps normal optimization.
// Drop-in replacement for next/image — swap the import, nothing else.
export default function AppImage(props: ImageProps) {
  return <Image {...props} unoptimized={props.unoptimized ?? isUnoptimizedRemoteImage(props.src)} />;
}
