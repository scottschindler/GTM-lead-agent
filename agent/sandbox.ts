import { defineSandbox } from "eve/sandbox";
import { justbash } from "eve/sandbox/just-bash";
import { vercel } from "eve/sandbox/vercel";

// Keep local sessions fast with just-bash, but use hosted Vercel Sandbox in
// production so build-time prewarm provisions templates for the workflow
// runtime. This agent only uses the sandbox to read skill markdown, so it does
// not depend on backend-specific use() options.
type Backend = ReturnType<typeof justbash>;

function backend(): Backend {
  return process.env.VERCEL ? (vercel() as unknown as Backend) : justbash();
}

export default defineSandbox({
  backend,
});
