export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#0f0f0f" }}>
        
        {/* HEADER */}
        <div
          style={{
            background: "#111",
            borderBottom: "1px solid #222",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* LOGO */}
          <a
            href="/"
            style={{
              color: "#d4af37",
              fontWeight: "bold",
              fontSize: "18px",
              textDecoration: "none",
            }}
          >
            Artist Protection Alliance
          </a>

          {/* NAV */}
          <div style={{ display: "flex", gap: "20px" }}>
            <a href="/opportunities" style={navStyle}>Opportunities</a>
            <a href="/artists" style={navStyle}>Artists</a>
            <a href="/admin/opportunities" style={navStyle}>Admin</a>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div>{children}</div>
      </body>
    </html>
  );
}

const navStyle = {
  color: "#ccc",
  textDecoration: "none",
  fontWeight: "bold",
};