export function LoginPage() {
  return (
    <div className="login">
      <div className="panel login-card">
        <h1>Vestaboard Studio</h1>
        <p>Sign in to manage the board. New here? Ask the admin for an invite first.</p>
        <a className="google-button" href="/auth/google">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
