import { ConfigEnv, UserConfigExport } from "vite";

export default function ({}: ConfigEnv): UserConfigExport {
  return {
    // For use with GitHub pages.
    build: { outDir: "docs" },
    base: "./",

    // Without this it was not copying the mp3 file.
    // The build would be missing a file but there was no error at build time.
    assetsInclude: "*.mp3",
  };
}
