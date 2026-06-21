import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WsProvider } from "@/components/WsProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content", // Key for PWA keyboard pushing layout
  themeColor: "#faf9f8",
};

export const metadata: Metadata = {
  title: "<2",
  description: "Hyper-reliable cloud messenger",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "<2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased w-full h-[100dvh] overflow-hidden flex flex-col bg-background">
        <WsProvider>
          {children}
        </WsProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

