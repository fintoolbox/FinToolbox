import "@/styles/globals.css";

import Layout from "../components/Layout"; // 👈 add this import

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}