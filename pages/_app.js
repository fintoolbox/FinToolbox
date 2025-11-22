// pages/_app.js
import "@/styles/globals.css";
import Layout from "../components/Layout";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // 🔄 Track SPA route changes as page views
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const handleRouteChange = (url) => {
      window.gtag?.("config", GA_MEASUREMENT_ID, {
        page_path: url,
      });
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]); // GA_MEASUREMENT_ID is static at runtime

  return (
    <>
      {/* 🧠 Load Google tag only if MEASUREMENT ID exists */}
      {GA_MEASUREMENT_ID && (
        <>
          {/* ⏱ GA script now loads AFTER the main page has loaded */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-init" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}

      {/* 🌐 Layout + Vercel analytics */}
      <Layout>
        <Component {...pageProps} />
        <Analytics />
      </Layout>
    </>
  );
}
