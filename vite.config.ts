import { ConfigEnv, UserConfigExport } from "vite";

export default function ({}: ConfigEnv): UserConfigExport {
  // For use with GitHub pages.
  return { build: { outDir: "docs" }, base: "./" };
}
