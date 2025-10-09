import { useSignIn, useClerk } from "@clerk/clerk-react";
import { useSearchParams, useNavigate } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/sign-in";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign In - Northstar" },
    { name: "description", content: "Sign in to your account" },
  ];
}

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signOut } = useClerk();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const extensionCallback = searchParams.get('extension_callback') === 'true';

  // Form state
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Determine redirect URL based on whether this is an extension auth
  const redirectUrl = extensionCallback
    ? "/extension-auth-callback"
    : "/app/v2/dashboard";

  const handleClearSession = async () => {
    try {
      // Sign out completely to clear any existing sessions
      await signOut();
      setError('');
      console.log('Session cleared');
    } catch (err) {
      console.log('No session to clear');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    // Clear any existing sessions first
    try {
      await signOut();
    } catch (err) {
      console.log('No existing session to clear');
    }

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate(redirectUrl);
      } else {
        setError('Additional verification required');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        {/* Header Section */}
        <div style={{
          padding: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: '600',
            color: 'var(--color-fg)',
            margin: '0 0 var(--space-2) 0',
            lineHeight: '1.2'
          }}>
            {extensionCallback ? "🌟 Extension Authentication" : "Welcome back"}
          </h1>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-muted)',
            margin: '0'
          }}>
            {extensionCallback
              ? "Sign in to sync your D2L assignments with Northstar"
              : "Sign in to your Northstar account"
            }
          </p>
        </div>

        {/* Content Section */}
        <div style={{
          padding: 'var(--space-6)',
          flex: '1',
          minHeight: '0',
          overflowY: 'auto'
        }}>
          {extensionCallback && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-accent-bg)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)'
            }}>
              <p style={{
                color: 'var(--color-accent)',
                fontSize: 'var(--text-sm)',
                margin: '0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                This tab will close automatically after sign-in
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)'
            }}>
              <p style={{
                color: 'var(--color-danger)',
                fontSize: 'var(--text-sm)',
                margin: '0 0 var(--space-2) 0'
              }}>
                {error}
              </p>
              {error.includes('Session already exists') && (
                <button
                  type="button"
                  onClick={handleClearSession}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--color-danger)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Clear Session & Try Again
                </button>
              )}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                color: 'var(--color-fg)',
                marginBottom: 'var(--space-2)'
              }}>
                Email address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder=""
                autoComplete="email"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-fg)',
                  fontSize: 'var(--text-sm)',
                  transition: 'border-color 0.2s ease',
                  opacity: isLoading ? '0.6' : '1'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 1px var(--color-accent)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                color: 'var(--color-fg)',
                marginBottom: 'var(--space-2)'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    paddingRight: '60px',
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-fg)',
                    fontSize: 'var(--text-sm)',
                    transition: 'border-color 0.2s ease',
                    opacity: isLoading ? '0.6' : '1'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-accent)';
                    e.target.style.boxShadow = '0 0 0 1px var(--color-accent)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: 'var(--text-xs)',
                    fontWeight: '500'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !emailAddress || !password}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: isLoading || !emailAddress || !password ? 'var(--color-muted)' : 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                cursor: isLoading || !emailAddress || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid currentColor',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Signing in...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>

        {/* Footer Section */}
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-subtle)',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-muted)',
            margin: '0'
          }}>
            Don't have an account?{' '}
            <a
              href="/sign-up"
              style={{
                color: 'var(--color-accent)',
                fontWeight: '500',
                textDecoration: 'none'
              }}
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
