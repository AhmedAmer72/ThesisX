import Link from "next/link";

export default function NotFound() {
  return (
    <div className="site-offset container py-24 text-center">
      <h1 className="font-display text-4xl">404</h1>
      <p className="text-muted mt-3">This page does not exist.</p>
      <div className="mt-8 flex gap-4 justify-center text-sm">
        <Link href="/" className="underline">
          Home
        </Link>
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>
        <Link href="/create" className="underline">
          Create fund
        </Link>
      </div>
    </div>
  );
}
