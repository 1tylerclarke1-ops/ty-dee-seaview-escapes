// Admin-only Stripe health check. Proves the sandbox connection by retrieving
// the account. Returns account id, display name, country, default currency,
// charges/payouts status, and livemode (must be false for the sandbox).
// Returns a clear error if the key is missing, malformed, or rejected.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { retrieveAccount, isLiveMode } from '../../shared/stripe.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ connected: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ connected: false, error: 'Forbidden' }, { status: 403 });
    }

    const account = await retrieveAccount();
    const livemode = isLiveMode();

    return Response.json({
      connected: true,
      livemode,
      account: {
        id: account.id,
        display_name: account.display_name || (account.business_profile && account.business_profile.name) || null,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      }
    });
  } catch (error) {
    // Missing key -> getStripe throws before any Stripe call.
    // Malformed/rejected key -> accounts.retrieve() throws.
    // Surface a clear message; status 200 so the panel can render it.
    return Response.json({ connected: false, error: error.message }, { status: 200 });
  }
}