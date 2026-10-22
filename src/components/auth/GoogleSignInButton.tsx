import { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID } from "../../lib/googleAuth";

const GSI_SRC = "https://accounts.google.com/gsi/client";
// Google's rendered button can't be wider than this.
const MAX_BUTTON_WIDTH = 400;

interface CredentialResponse {
  credential?: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        ux_mode?: "popup" | "redirect";
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let gsiLoading: Promise<void> | null = null;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoading) {
    gsiLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gsiLoading = null;
        reject(new Error("Failed to load Google Identity Services"));
      };
      document.head.appendChild(script);
    });
  }
  return gsiLoading;
}

interface GoogleSignInButtonProps {
  text: "signin_with" | "signup_with" | "continue_with";
  // Google's ID token, to exchange at POST /auth/google.
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}

// Google's own button (it must be Google-rendered to return an ID token).
// Signing in and signing up are the same flow: the backend creates the
// account on first use.
export default function GoogleSignInButton({ text, onCredential, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Google keeps the callback from initialize(), so route it through a ref to
  // always call the latest props.
  const callbacks = useRef({ onCredential, onError });
  useEffect(() => {
    callbacks.current = { onCredential, onError };
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        const container = containerRef.current;
        if (cancelled || !container || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          callback: (response) => {
            if (response.credential) callbacks.current.onCredential(response.credential);
            else callbacks.current.onError("Google sign-in was cancelled. Please try again.");
          },
        });
        window.google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text,
          logo_alignment: "center",
          width: Math.min(container.offsetWidth || MAX_BUTTON_WIDTH, MAX_BUTTON_WIDTH),
        });
      })
      .catch(() => {
        if (!cancelled) {
          callbacks.current.onError("Couldn't load Google sign-in. Check your connection and try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={containerRef} data-testid="google-signin" className="mb-5 flex min-h-11 justify-center" />;
}
