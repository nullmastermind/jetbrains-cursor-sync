// ./build/index.js --root=$ContentRoot$ --column-number=$ColumnNumber$ --line-number=$LineNumber$ --file-path=$FilePath$
import autoit from "node-autoit-koffi";
import { exec } from "child_process";

function parseProcessArgs(): Record<string, any> {
  const args = process.argv.slice(2);
  const result: Record<string, any> = {};

  for (const arg of args) {
    const [key, value] = arg.split("=");
    const propertyName = key
      .replace(/^--/, "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    result[propertyName] = isNaN(Number(value)) ? value : Number(value);
  }

  return result;
}

async function main() {
  await autoit.init();

  const parsedArgs = parseProcessArgs();

  // console.log("Parsed arguments:", parsedArgs);

  if (parsedArgs.root) {
    await new Promise<void>(async (resolve) => {
      const root = JSON.stringify(parsedArgs.root);
      const filePath = JSON.stringify(parsedArgs.filePath);
      const lineNumber = parsedArgs.lineNumber;
      const columnNumber = parsedArgs.columnNumber;

      exec(
        `cursor ${root} -g ${filePath}:${lineNumber}:${columnNumber}`,
        () => {
          resolve();
        },
      );
    });
  }

  await autoit.winActivate("[REGEXPTITLE:(.*?)- Cursor]");
}

void main();
