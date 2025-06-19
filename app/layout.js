export const metadata = {
  title: "Kaspaiq.com",
  description: "Send $kas to find out your IQ!",
};

import "../styles/globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 