import "dotenv/config";
import OpenAI from "openai";

function mask(value?: string) {
  if (!value) {
    return "(missing)";
  }

  if (value.length <= 10) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  console.log("Testing OpenAI-compatible chat completion endpoint");
  console.log(`OPENAI_BASE_URL: ${baseURL || "(official OpenAI default)"}`);
  console.log(`OPENAI_MODEL: ${model}`);
  console.log(`OPENAI_API_KEY: ${mask(apiKey)}`);

  if (!apiKey) {
    console.error("OPENAI_API_KEY is missing.");
    process.exitCode = 1;
    return;
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 16,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: API_OK",
        },
      ],
    });

    console.log("Request succeeded.");
    console.log(`Response id: ${response.id}`);
    console.log(`Response model: ${response.model}`);
    console.log(`Assistant message: ${response.choices[0]?.message?.content || "(empty)"}`);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? error.status : undefined;
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    const type = typeof error === "object" && error && "type" in error ? error.type : undefined;
    const message = error instanceof Error ? error.message : String(error);

    console.error("Request failed.");
    console.error(`Status: ${status ?? "(unknown)"}`);
    console.error(`Code: ${code ?? "(unknown)"}`);
    console.error(`Type: ${type ?? "(unknown)"}`);
    console.error(`Message: ${message.replace(apiKey, mask(apiKey))}`);
    process.exitCode = 1;
  }
}

main();
