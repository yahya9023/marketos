import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c1b2a] p-4">
      <section className="w-full max-w-md rounded-2xl bg-[#f5f7f2] p-8 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">
          Access denied
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#0c1b2a]">Unauthorized</h1>
        <p className="mt-3 text-sm font-medium text-[#5f746d]">
          You do not have permission to access this area.
        </p>
        <Link
          href="/pos"
          className="mt-6 inline-flex rounded-lg bg-[#0c1b2a] px-4 py-3 text-sm font-black text-white hover:bg-[#1c354c]"
        >
          Go to POS
        </Link>
      </section>
    </main>
  );
}