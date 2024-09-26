import autoit from "node-autoit-koffi";

async function main() {
  await autoit.init();
  // Your code here
  await autoit.mouseMove(0, 0);

  console.log("OK");
}

void main();
