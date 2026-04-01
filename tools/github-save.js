const { spawnSync } = require("child_process");
const path = require("path");
const readline = require("readline");

if (process.platform === "win32") {
  spawnSync("cmd", ["/c", "chcp", "65001"], {
    encoding: "utf-8",
    stdio: "ignore",
  });
}

if (typeof process.stdout.setEncoding === "function") {
  process.stdout.setEncoding("utf8");
}

if (typeof process.stderr.setEncoding === "function") {
  process.stderr.setEncoding("utf8");
}

if (typeof process.stdin.setEncoding === "function") {
  process.stdin.setEncoding("utf8");
}

const repoRoot = path.resolve(__dirname, "..");
process.chdir(repoRoot);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function logInfo(message) {
  process.stdout.write(`[INFO] ${message}\n`);
}

function logDone(message) {
  process.stdout.write(`[DONE] ${message}\n`);
}

function logFail(message) {
  process.stderr.write(`[FAIL] ${message}\n`);
}

function runGit(args, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf-8",
    windowsHide: false,
  });

  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  const output = [stdout, stderr].filter(Boolean).join("\n").trim();

  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${output}`);
  }

  return {
    exitCode: result.status ?? 0,
    output,
  };
}

function sanitizeMessage(input) {
  const sanitized = input.replace(/[^\p{L}\p{N}\p{Zs}\-_,.:/()[\]&+#]/gu, "").trim();
  return sanitized.slice(0, 120).trim();
}

async function main() {
  try {
    logInfo("photo-picker 저장소 상태를 확인하는 중입니다.");

    const insideRepo = runGit(["rev-parse", "--is-inside-work-tree"], true);
    if (insideRepo.exitCode !== 0 || insideRepo.output !== "true") {
      throw new Error("이 폴더는 git 저장소가 아닙니다.");
    }

    const origin = runGit(["remote", "get-url", "origin"], true);
    if (origin.exitCode !== 0 || !origin.output) {
      throw new Error("remote origin 이 설정되어 있지 않습니다.");
    }

    const status = runGit(["status", "--short"]);
    if (!status.output) {
      process.stdout.write("\n");
      logDone("업로드할 변경사항이 없습니다.");
      await ask("창을 닫으려면 Enter를 누르세요");
      return;
    }

    const defaultMessage = `photo-picker update: ${new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", " ")}`;

    process.stdout.write("\n");
    process.stdout.write("커밋 메시지를 입력하세요. 비워두면 기본 메시지를 사용합니다.\n");
    const rawMessage = await ask("커밋 메시지: ");
    const commitMessage = sanitizeMessage(rawMessage) || defaultMessage;

    process.stdout.write("\n");
    const confirm = await ask("현재 변경사항을 GitHub에 업로드할까요? (y/N): ");
    if (!["y", "Y", "yes", "YES"].includes(confirm.trim())) {
      process.stdout.write("작업을 취소했습니다.\n");
      await ask("창을 닫으려면 Enter를 누르세요");
      return;
    }

    const branchResult = runGit(["rev-parse", "--abbrev-ref", "HEAD"], true);
    const branch =
      branchResult.exitCode === 0 && branchResult.output && branchResult.output !== "HEAD"
        ? branchResult.output
        : "main";

    logInfo("변경사항을 스테이징합니다.");
    runGit(["add", "-A"]);

    const postAddStatus = runGit(["status", "--short"]);
    if (!postAddStatus.output) {
      logDone("업로드할 변경사항이 없습니다.");
      await ask("창을 닫으려면 Enter를 누르세요");
      return;
    }

    logInfo("커밋을 생성합니다.");
    const commit = runGit(["commit", "-m", commitMessage], true);
    if (commit.exitCode !== 0) {
      if (commit.output.includes("nothing to commit")) {
        logDone("업로드할 변경사항이 없습니다.");
        await ask("창을 닫으려면 Enter를 누르세요");
        return;
      }

      throw new Error(`커밋 생성에 실패했습니다. ${commit.output}`);
    }

    logInfo(`origin/${branch} 로 push 합니다.`);
    const push = runGit(["push", "origin", branch], true);
    if (push.exitCode !== 0) {
      throw new Error(`push 실패: ${push.output}`);
    }

    process.stdout.write("\n");
    logDone("GitHub 업로드가 완료되었습니다.");
    if (push.output) {
      process.stdout.write(`${push.output}\n`);
    }
  } catch (error) {
    process.stdout.write("\n");
    logFail(error instanceof Error ? error.message : String(error));
  } finally {
    process.stdout.write("\n");
    await ask("창을 닫으려면 Enter를 누르세요");
    rl.close();
  }
}

main();
