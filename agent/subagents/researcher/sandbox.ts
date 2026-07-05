import { defineSandbox } from "eve/sandbox";
import { justbash } from "eve/sandbox/just-bash";
import { vercel } from "eve/sandbox/vercel";

// Subagents do not inherit the parent's sandbox. Keep local sessions on
// just-bash, but use Vercel Sandbox in production so workflow template
// prewarm and runtime use the same hosted backend.
type Backend = ReturnType<typeof justbash>;

function backend(): Backend {
  return process.env.VERCEL ? (vercel() as unknown as Backend) : justbash();
}

export default defineSandbox({
  backend,
});
