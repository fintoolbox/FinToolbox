// components/Breadcrumbs.js
import Link from "next/link";
import { useRouter } from "next/router";

export default function Breadcrumbs() {
  const router = useRouter();
  if (router.asPath === "/") return null;
  const pathParts = router.asPath.split("/").filter(Boolean);

  
  // Build links progressively
  const homeCrumb = (
  <li key="home" className="flex items-center">
    <Link href="/" className="text-blue-600 hover:underline">Home</Link>
    {pathParts.length > 0 && <span className="mx-2 text-gray-400">/</span>}
  </li>
);

  const breadcrumbs = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    const label = decodeURIComponent(part.replace(/-/g, " "));
    const isLast = index === pathParts.length - 1;

    return (
      <li key={href} className="flex items-center">
        {!isLast ? (
          <>
            <Link href={href} className="text-blue-600 hover:underline capitalize">
              {label}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
          </>
        ) : (
          <span className="text-gray-700 capitalize">{label}</span>
        )}
      </li>
    );
  });

  // Don’t show on home
  if (pathParts.length === 0) return null;

  return (
    <nav className="mb-4 text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap">{breadcrumbs}</ol>
    </nav>
  );
}
