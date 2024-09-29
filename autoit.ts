import { dlopen, FFIType, suffix } from "bun:ffi";

const lib = dlopen(`./AutoItX3_x64.${suffix}`, {
  AU3_WinExists: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  AU3_WinActivate: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
});

export function winExists(title: string, text: string = ""): boolean {
  const result = lib.symbols.AU3_WinExists(
    Buffer.from(title + "\0", "utf16le"),
    Buffer.from(text + "\0", "utf16le"),
  );
  return result === 1;
}

export function winActivate(title: string, text: string = ""): boolean {
  const result = lib.symbols.AU3_WinActivate(
    Buffer.from(title + "\0", "utf16le"),
    Buffer.from(text + "\0", "utf16le"),
  );
  return result === 1;
}

// async function main() {
//   console.log(winExists("[REGEXPTITLE:(.*?)- Cursor]"));
//   console.log(winActivate("[REGEXPTITLE:(.*?)- Cursor]"));
// }
//
// void main();
