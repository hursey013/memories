import fs from "node:fs";
import { execSync } from "node:child_process";

export function getGitCommit() {
  try {
    const envSha = process.env.GIT_COMMIT || process.env.GIT_SHA;
    if (envSha && String(envSha).trim()) return String(envSha).trim();

    if (fs.existsSync(".git-commit")) {
      const fileSha = fs.readFileSync(".git-commit", "utf-8").trim();
      if (fileSha) return fileSha;
    }

    // Works in dev if .git is present
    const out = execSync("git rev-parse --short=12 HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (out) return out;
  } catch {}
  return "unknown";
}

