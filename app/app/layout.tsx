import React from "react";
import Providers from "./providers";

export const metadata = {
  title: "AutoTrust Paymesh (MNEE)",
  description: "Programmable MNEE escrow with Ops Log",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ 
        margin: 0, 
        padding: 0,
        minHeight: "100vh",
        fontFamily: "ui-sans-serif, system-ui, -apple-system",
      }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
