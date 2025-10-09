import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { useUserSetup } from "../hooks/useUserSetup";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Welcome to Northstar" },
    { name: "description", content: "Login or Sign Up to Continue" },
  ];
}

export default function Home() {
  const { needsOnboarding, isUserReady, convexUser, user, isLoaded, isCreatingUser, userCreationFailed } = useUserSetup();
  const navigate = useNavigate();

  // Debug logging (disabled for production)
  // console.log('Home component state:', {
  //   needsOnboarding,
  //   isUserReady,
  //   hasConvexUser: !!convexUser,
  //   hasClerkUser: !!user,
  //   isLoaded,
  //   isCreatingUser,
  //   userCreationFailed
  // });

  // Determine the correct dashboard URL based on onboarding status
  const getDashboardUrl = () => {
    // Ensure isUserReady is treated as boolean
    const userReady = Boolean(isUserReady);
    
    if (!userReady) return "/onboarding"; // Default while loading
    return needsOnboarding ? "/onboarding" : "/app/v2/dashboard";
  };

  const handleGoToDashboard = () => {
    const url = getDashboardUrl();
    navigate(url);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5vh 16px'
    }}>
      <SignedIn>
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-8)',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: '600',
            color: 'var(--color-fg)',
            marginBottom: 'var(--space-4)'
          }}>
            Welcome to Northstar
          </h1>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-muted)',
            marginBottom: 'var(--space-6)'
          }}>
            You're already signed in
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            alignItems: 'center'
          }}>
                <button
                  onClick={handleGoToDashboard}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Go to Dashboard
            </button>
            
            <div style={{ marginTop: 'var(--space-2)' }}>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-12 h-12"
                  }
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-8)',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: '600',
            color: 'var(--color-fg)',
            marginBottom: 'var(--space-2)'
          }}>
            Welcome to Northstar
          </h1>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-muted)',
            marginBottom: 'var(--space-6)'
          }}>
            Login or Sign Up to Continue
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)'
          }}>
            <a
              href="/sign-in"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 16px',
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'opacity 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Sign In
            </a>

            <a
              href="/sign-up"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 16px',
                background: 'var(--color-card)',
                color: 'var(--color-fg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-subtle)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--color-card)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              Create Account
            </a>
          </div>

          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-muted)',
            lineHeight: '1.5',
            margin: '0'
          }}>
            By continuing, you agree to our{' '}
            <a
              href="https://dreamparklabs.com/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-accent)',
                textDecoration: 'none'
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
                textDecoration: 'none'
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
                textDecoration: 'none'
              }}
            >
              End-User License Agreement
            </a>
          </p>
        </div>
      </SignedOut>
    </div>
  );
}
