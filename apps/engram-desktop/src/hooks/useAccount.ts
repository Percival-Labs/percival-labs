import { openUrl } from "../lib/ipc";

const ACCOUNT_BASE = "https://percivalvouch-api-production.up.railway.app/v1/accounts";

interface AccountStatus {
  active: boolean;
  credits: number;
  plan: string;
  agentKey?: string;
}

export function useAccount() {
  async function createAccount(
    email: string,
    name: string
  ): Promise<{ checkoutUrl: string } | { error: string }> {
    try {
      const res = await fetch(`${ACCOUNT_BASE}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      if (!res.ok) {
        return { error: `Server returned ${res.status}` };
      }

      const data = await res.json();

      // Open Stripe checkout in system browser
      if (data.checkoutUrl) {
        await openUrl(data.checkoutUrl);
      }

      return data;
    } catch {
      return { error: "Could not reach account server" };
    }
  }

  async function pollStatus(
    email: string,
    token: string
  ): Promise<AccountStatus | null> {
    try {
      const res = await fetch(
        `${ACCOUNT_BASE}/status?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  return { createAccount, pollStatus };
}
