// Simple extension auth page - no server-side logic needed

export default function ExtensionAuth() {

  // Show login form for extension users
  return (
    <div style={{ 
      padding: "20px", 
      fontFamily: "system-ui",
      maxWidth: "400px",
      margin: "50px auto",
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
    }}>
      <h2 style={{ textAlign: "center", color: "#1f2937" }}>🌟 Sign in to Northstar</h2>
      <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "30px" }}>
        Extension Authentication
      </p>
      
      <div style={{ 
        padding: "20px", 
        backgroundColor: "#fef3c7", 
        borderRadius: "6px", 
        marginBottom: "20px",
        border: "1px solid #f59e0b"
      }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#92400e" }}>🔐 Quick Setup</h3>
        <ol style={{ margin: "0", paddingLeft: "20px", color: "#92400e" }}>
          <li>Click "Go to Dashboard" below to sign in</li>
          <li>Once signed in, return to the extension</li>
          <li>The extension will automatically detect your login</li>
        </ol>
      </div>
      
      <div style={{ textAlign: "center" }}>
        <a 
          href="/sign-in" 
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "600",
            marginBottom: "15px"
          }}
        >
          🚀 Go to Dashboard
        </a>
        
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Don't have an account? <a href="/sign-up" style={{ color: "#3b82f6" }}>Sign up here</a>
        </p>
      </div>
    </div>
  );
}
