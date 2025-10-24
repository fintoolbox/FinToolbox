import "@/styles/globals.css";
import Layout from "../components/Layout";
import { Analytics } from "@vercel/analytics/react"; // ✅ add this import
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
      <SpeedInsights />
      <Analytics /> {/* ✅ add this just before closing Layout */}
    </Layout>
  );
}
