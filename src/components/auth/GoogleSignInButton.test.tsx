import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type Callback = (response: { credential?: string }) => void;

function stubGoogle() {
  let callback: Callback = () => {};
  const id = {
    initialize: vi.fn((config: { callback: Callback }) => {
      callback = config.callback;
    }),
    renderButton: vi.fn(),
  };
  window.google = { accounts: { id } };
  return { id, respond: (response: { credential?: string }) => callback(response) };
}

// GOOGLE_CLIENT_ID is read at import time, so load the module after stubbing env.
async function loadButton(clientId: string) {
  vi.resetModules();
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", clientId);
  return (await import("./GoogleSignInButton")).default;
}

describe("GoogleSignInButton", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.google;
  });

  it("renders nothing when no client ID is configured", async () => {
    const GoogleSignInButton = await loadButton("");
    const { container } = render(
      <GoogleSignInButton text="signin_with" onCredential={vi.fn()} onError={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Google's button and passes the credential on", async () => {
    const google = stubGoogle();
    const onCredential = vi.fn();
    const GoogleSignInButton = await loadButton("client-123.apps.googleusercontent.com");
    render(<GoogleSignInButton text="signup_with" onCredential={onCredential} onError={vi.fn()} />);

    await waitFor(() => expect(google.id.renderButton).toHaveBeenCalled());
    expect(google.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "client-123.apps.googleusercontent.com", ux_mode: "popup" })
    );
    const [parent, options] = google.id.renderButton.mock.calls[0];
    expect(parent).toBe(screen.getByTestId("google-signin"));
    expect(options).toMatchObject({ text: "signup_with", theme: "outline" });

    google.respond({ credential: "id-token" });
    expect(onCredential).toHaveBeenCalledWith("id-token");
  });

  it("reports a response without a credential", async () => {
    const google = stubGoogle();
    const onError = vi.fn();
    const GoogleSignInButton = await loadButton("client-123");
    render(<GoogleSignInButton text="signin_with" onCredential={vi.fn()} onError={onError} />);
    await waitFor(() => expect(google.id.initialize).toHaveBeenCalled());

    google.respond({});
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/cancelled/));
  });
});
