import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc } from "eve/channels/auth";

// Route auth for POST /eve/v1/session (+ continue/stream). eve fails closed,
// so without a final `none()` production browser traffic gets a 401: the
// dashboard's fetch carries no Vercel OIDC token and isn't loopback.
// `none()` deliberately admits anonymous visitors — this demo runs on seeded
// data. Swap it for httpBasic()/a real authenticator before putting anything
// sensitive behind this agent.
export default eveChannel({
  auth: [vercelOidc(), localDev(), none()],
});
