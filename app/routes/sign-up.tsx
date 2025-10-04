import { useSignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/sign-up";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up - Northstar" },
    { name: "description", content: "Create a new account" },
  ];
}

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();

  // Form state
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  // Verification state
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/onboarding');
      } else {
        setError('Verification incomplete. Please check your code and try again.');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verification view
  if (pendingVerification) {
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
              Verify your email
            </h1>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-muted)',
              margin: '0'
            }}>
              We've sent a verification code to {emailAddress}
            </p>
          </div>

          {/* Content Section */}
          <div style={{
            padding: 'var(--space-6)',
            flex: '1',
            minHeight: '0',
            overflowY: 'auto'
          }}>
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
                  margin: '0'
                }}>
                  {error}
                </p>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={handleVerification} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '500',
                  color: 'var(--color-fg)',
                  marginBottom: 'var(--space-2)'
                }}>
                  Verification code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter verification code"
                  autoComplete="off"
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

              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: isLoading || !code.trim() ? 'var(--color-muted)' : 'var(--color-accent)',
                  color: 'var(--color-accent-fg)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '500',
                  cursor: isLoading || !code.trim() ? 'not-allowed' : 'pointer',
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
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
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
              Already have an account?{' '}
              <a
                href="/sign-in"
                style={{
                  color: 'var(--color-accent)',
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
              >
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main sign-up form
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
            Create Account
          </h1>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-muted)',
            margin: '0'
          }}>
            Join Northstar to get started
          </p>
        </div>

        {/* Content Section */}
        <div style={{
          padding: 'var(--space-6)',
          flex: '1',
          minHeight: '0',
          overflowY: 'auto'
        }}>
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
                margin: '0'
              }}>
                {error}
              </p>
            </div>
          )}

          {/* Sign-up Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <div style={{ flex: '1' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '500',
                  color: 'var(--color-fg)',
                  marginBottom: 'var(--space-2)'
                }}>
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder=""
                  autoComplete="given-name"
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
              <div style={{ flex: '1' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '500',
                  color: 'var(--color-fg)',
                  marginBottom: 'var(--space-2)'
                }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder=""
                  autoComplete="family-name"
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
            </div>

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
                  autoComplete="new-password"
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

            {/* Legal Agreement Checkbox */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)'
            }}>
              <input
                type="checkbox"
                id="legal-checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                disabled={isLoading}
                style={{
                  marginTop: '3px',
                  accentColor: 'var(--color-accent)',
                  cursor: 'pointer'
                }}
              />
              <label
                htmlFor="legal-checkbox"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-fg)',
                  cursor: 'pointer',
                  lineHeight: '1.5',
                  userSelect: 'none'
                }}
              >
                I agree to the{' '}
                <a
                  href="https://dreamparklabs.com/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Terms of Service
                </a>
                ,{' '}
                <a
                  href="https://dreamparklabs.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Privacy Policy
                </a>
                , and{' '}
                <a
                  href="https://dreamparklabs.com/legal/eula"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  End-User License Agreement
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !emailAddress || !password || !firstName || !lastName || !legalAccepted}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: isLoading || !emailAddress || !password || !firstName || !lastName || !legalAccepted ? 'var(--color-muted)' : 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                cursor: isLoading || !emailAddress || !password || !firstName || !lastName || !legalAccepted ? 'not-allowed' : 'pointer',
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
                  Creating account...
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
            Already have an account?{' '}
            <a
              href="/sign-in"
              style={{
                color: 'var(--color-accent)',
                fontWeight: '500',
                textDecoration: 'none'
              }}
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
