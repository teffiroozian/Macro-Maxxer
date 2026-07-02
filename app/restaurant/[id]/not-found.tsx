import Link from "next/link";

export default function RestaurantNotFound() {
  return (
    <main style={{ maxWidth: 900, margin: "48px auto", padding: 16 }}>
      <Link href="/" style={{ textDecoration: "none", cursor: "pointer" }}>
        ← Back to homepage
      </Link>
      <h1 style={{ marginTop: 16 }}>Restaurant not found</h1>
      <p style={{ color: "#555" }}>
        We couldn&apos;t find that restaurant. Please choose another restaurant from
        the homepage.
      </p>
    </main>
  );
}
