// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="google-adsense-account" content="ca-pub-4674539469430065" />
      </Head>
      <body className="font-sans">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
