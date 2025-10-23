import "@/styles/globals.css";
import Layout from "../components/Layout";
import { Analytics } from "@vercel/analytics/react"; // ✅ add this import

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
      <Analytics /> {/* ✅ add this just before closing Layout */}
    </Layout>
  );
}
