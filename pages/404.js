import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-4xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-gray-600">Try the calculators below:</p>
      <div className="mt-6 grid gap-3">
        <Link href="/" className="text-brand-700 hover:text-brand-800 underline underline-offset-2">Home</Link>
        <Link href="/calculators/tax-calculator" className="text-brand-700 hover:text-brand-800 underline underline-offset-2">Income Tax</Link>
        <Link href="/calculators/investment-growth" className="text-brand-700 hover:text-brand-800 underline underline-offset-2">Compound Interest</Link>
      </div>
    </div>
  );
}
