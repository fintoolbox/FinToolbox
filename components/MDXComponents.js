// components/MDXComponents.js
import Link from "next/link";
import Tooltip from "@/components/Tooltip"; // ← add this line


// Tailwind-styled elements + custom components available in MDX
export default {
  // Typography
  h1: (props) => <h1 className="mt-6 text-3xl font-bold" {...props} />,
  h2: (props) => <h2 className="mt-6 text-2xl font-bold" {...props} />,
  h3: (props) => <h3 className="mt-5 text-xl font-semibold" {...props} />,
  p:  (props) => <p className="mt-4 leading-7 text-gray-800" {...props} />,
  a:  (props) => (
    <a
      className="text-brand-700 hover:text-brand-800 underline underline-offset-2"
      {...props}
    />
  ),
  ul: (props) => <ul className="mt-4 list-disc pl-5" {...props} />,
  ol: (props) => <ol className="mt-4 list-decimal pl-5" {...props} />,
  blockquote: (props) => (
    <blockquote className="mt-4 border-l-4 border-gray-200 pl-4 italic text-gray-700" {...props} />
  ),
  table: (props) => (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border text-sm" {...props} />
    </div>
  ),

  // Re-export Next Link if you want it available as <Link> in MDX
  Link,

  // 👇 Make Tooltip available to all MDX files
  Tooltip,
};
