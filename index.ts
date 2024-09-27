// ./build/index.js --root=$ContentRoot$ --column-number=$ColumnNumber$ --line-number=$LineNumber$ --file-path=$FilePath$
import autoit from "node-autoit-koffi";
import { exec } from "child_process";
import axios from "axios";

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

const runCommand = async (commandId: string, args?: any[]) => {
  await axios
    .post("http://localhost:3711/command", {
      command: commandId,
      args,
    })
    .catch(() => Promise.resolve());
};

async function main() {
  await autoit.init();

  await autoit.winActivate("[REGEXPTITLE:(.*?)- Cursor]");

  const parsedArgs = parseProcessArgs();

  if (parsedArgs.root) {
    if (parsedArgs.command !== "chat") void runCommand("aichat.close-sidebar");
    if (parsedArgs.command === "chat") void runCommand("aichat.newchatbuttonaction");

    const selectionInfo = ((parsedArgs.select as string) || "0:0-0:0").split("-").map((s) => {
      const [line, column] = s.split(":");
      return { line: Number(line), column: Number(column), s };
    });
    let shouldSelect = false;

    // console.log("Parsed arguments:", parsedArgs);
    // console.log("Selection info:", selectionInfo);

    if (selectionInfo[0].s !== selectionInfo[1].s) {
      parsedArgs.lineNumber = selectionInfo[0].line;
      parsedArgs.columnNumber = 0;
      shouldSelect = true;
    }

    const root = JSON.stringify(parsedArgs.root);
    const filePath = JSON.stringify(parsedArgs.filePath);
    const lineNumber = parsedArgs.lineNumber;
    const columnNumber = parsedArgs.columnNumber;

    await new Promise<void>((resolve) => {
      exec(`cursor ${root} -g ${filePath}:${lineNumber}:${columnNumber}`, async () => {
        resolve();
      });
    });

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
            by: "wrappedLineStart",
            select: true,
            value: selectionInfo[1].line - selectionInfo[0].line,
          },
        ]);
      }

      const endColumn = selectionInfo[1].column - 1 - (selectionInfo[0].column - 1);

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

    if (parsedArgs.command === "chat") void runCommand("aichat.newchataction");
    if (parsedArgs.command === "quick-chat") void runCommand("aipopup.action.modal.generate");

    void runCommand("viewPortCenter");
  }
}

void main();
