import { useEffect } from 'react';

export default function AdSense({ adSlot }) {
  useEffect(() => {
    try {
      // Initialize the ad unit
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  return (
    <div className="flex justify-center my-8 no-print" aria-hidden="true">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4674539469430065" // Replace with your actual publisher ID
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}