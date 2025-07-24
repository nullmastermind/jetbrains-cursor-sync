import axios from "axios";
import { ensureFile, pathExists, readFile, readJson, writeFile, writeJson } from "fs-extra";
import * as path from "node:path";
import * as os from "node:os";
import { exec } from "child_process";

let settings = {
  "restRemoteControl.port": 0,
};

const ensureSettings = async () => {
  let savedPortPath = path.join(os.homedir(), ".vscodium/port");
  if (!(await pathExists(savedPortPath))) {
    await ensureFile(savedPortPath);
    await writeFile(savedPortPath, "60000");
  }

  const settingsPath = path.join(process.cwd(), ".vscode/settings.json");
  settings = {
    "restRemoteControl.port": 0,
  };

  if (!(await pathExists(settingsPath))) {
    await ensureFile(settingsPath);
    await writeJson(settingsPath, settings, {
      spaces: 2,
    });
  }

  const currentSettings = await readJson(settingsPath);
  if (!currentSettings["restRemoteControl.port"]) {
    currentSettings["restRemoteControl.port"] =
      +(await readFile(savedPortPath)).toString("utf-8") + 1;
    await writeFile(savedPortPath, currentSettings["restRemoteControl.port"] + 1 + "");
    await writeJson(settingsPath, currentSettings, {
      spaces: 2,
    });
  }

  settings["restRemoteControl.port"] = currentSettings["restRemoteControl.port"];
};

const runCommand = async (commandId: string, args?: any[]) => {
  return await axios
    .post(`http://localhost:${settings["restRemoteControl.port"]}/command`, {
      command: commandId,
      args,
    })
    .catch((e) => Promise.resolve(e.response));
};

function parseProcessArgs(): Record<string, unknown> {
  const args = process.argv.slice(2);
  const result: Record<string, unknown> = {};

  for (const arg of args) {
    const [key, value] = arg.split("=");
    const propertyName = key
      .replace(/^--/, "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    result[propertyName] = parseValue(value);
  }

  return result;
}

function parseValue(value: string): unknown {
  if (value === undefined) return true; // Flag arguments
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  if (value === "") return "";
  if (!isNaN(Number(value))) return Number(value);
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      return JSON.parse(value);
    } catch {
      // If parsing fails, return as string
    }
  }
  return value; // Default to string
}

async function codiumMain() {
  await ensureSettings();

  exec("vscodium .", {
    cwd: process.cwd(),
  });

  const parsedArgs = parseProcessArgs();

  const selectionInfo = ((parsedArgs.select as string) || "0:0-0:0").split("-").map((s) => {
    const [line, column] = s.split(":");
    return { line: Number(line), column: Number(column), s };
  });
  let shouldSelect = false;
  let endColumn = 0;

  // console.log("Parsed arguments:", parsedArgs);
  // console.log("Selection info:", selectionInfo);

  if (selectionInfo[0].s !== selectionInfo[1].s) {
    parsedArgs.lineNumber = selectionInfo[0].line;
    parsedArgs.columnNumber = 0;
    shouldSelect = true;
  }

  const lineNumber = Number(parsedArgs.lineNumber);
  const columnNumber = parsedArgs.columnNumber;

  await runCommand("custom.goToFileLineCharacter", [
    parsedArgs.filePath,
    lineNumber - 1,
    columnNumber,
  ]);

  if (shouldSelect) {
    if (selectionInfo[0].column > 1) {
      await runCommand("cursorMove", [
        {
          to: "right",
          by: "character",
          select: false,
          value: selectionInfo[0].column - 1,
        },
      ]);
    }

    if (selectionInfo[0].line !== selectionInfo[1].line) {
      await runCommand("cursorMove", [
        {
          to: "down",
          by: "line",
          select: true,
          value: selectionInfo[1].line - selectionInfo[0].line,
        },
      ]);
    }

    endColumn = selectionInfo[1].column - 1 - (selectionInfo[0].column - 1);

    if (endColumn > 0) {
      await runCommand("cursorMove", [
        {
          to: "right",
          by: "character",
          select: true,
          value: endColumn,
        },
      ]);
    }
  }

  console.log("[DONE]");
}

void codiumMain();
