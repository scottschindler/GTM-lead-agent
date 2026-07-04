import { defineSandbox } from "eve/sandbox";
import { justbash } from "eve/sandbox/just-bash";

// Pin the sandbox to the in-process just-bash backend. The default backend
// boots a microsandbox micro-VM on this host, which adds session startup
// latency and can wedge (hanging load_skill forever). This agent only uses
// the sandbox to read skill markdown — bash is disabled — so the
// dependency-free virtual filesystem is strictly better here.
export default defineSandbox({
  backend: justbash(),
});
