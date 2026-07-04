import { defineSandbox } from "eve/sandbox";
import { justbash } from "eve/sandbox/just-bash";

// Subagents do not inherit the parent's sandbox. Pin the researcher to the
// in-process just-bash backend too, so each run doesn't boot a second
// microsandbox micro-VM it never uses (bash is disabled).
export default defineSandbox({
  backend: justbash(),
});
