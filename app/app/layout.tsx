import React from "react";
import Providers from "./providers";

export const metadata = {
  title: "AutoTrust Paymesh (MNEE)",
  description: "Programmable MNEE escrow with Ops Log",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, -apple-system" }}>
        <Providers>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
