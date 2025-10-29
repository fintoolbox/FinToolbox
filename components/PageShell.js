// components/PageShell.js
export default function PageShell({ children }) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {children}
    </main>
  );
}
