import { writeFileSync, readFileSync } from "fs";

const API_URL = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_WAIT_MS = 600_000; // 10 minutes

function getToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN environment variable is required.\n" +
      "Get one at https://replicate.com/account/api-tokens"
    );
  }
  return token;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

export async function uploadFile(filePath: string): Promise<string> {
  const fileBuffer = readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append("content", blob, filePath.split("/").pop()!);

  const resp = await fetch(`${API_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to upload ${filePath}: ${resp.status} ${body}`);
  }

  const data = (await resp.json()) as { urls: { get: string } };
  return data.urls.get;
}

export interface PredictionResult {
  id: string;
  status: string;
  output: unknown;
  error: string | null;
  metrics?: { total_time?: number };
}

export async function createOfficialPrediction(
  modelOwner: string,
  modelName: string,
  input: Record<string, unknown>
): Promise<{ id: string; status: string }> {
  const resp = await fetch(
    `${API_URL}/models/${modelOwner}/${modelName}/predictions`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ input }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Failed to create prediction for ${modelOwner}/${modelName}: ${resp.status} ${body}`
    );
  }

  return (await resp.json()) as { id: string; status: string };
}

export async function pollPrediction(id: string): Promise<PredictionResult> {
  const start = Date.now();

  while (Date.now() - start < POLL_MAX_WAIT_MS) {
    const resp = await fetch(`${API_URL}/predictions/${id}`, {
      headers: headers(),
    });

    if (!resp.ok) {
      throw new Error(`Failed to poll prediction ${id}: ${resp.status}`);
    }

    const data = (await resp.json()) as PredictionResult;

    if (data.status === "succeeded") {
      return data;
    }

    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(
        `Prediction ${id} ${data.status}: ${data.error || "unknown error"}`
      );
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Prediction ${id} timed out after ${POLL_MAX_WAIT_MS}ms`);
}

export async function runPrediction(
  modelOwner: string,
  modelName: string,
  input: Record<string, unknown>
): Promise<PredictionResult> {
  const pred = await createOfficialPrediction(modelOwner, modelName, input);
  return pollPrediction(pred.id);
}

export async function downloadFile(
  url: string,
  outputPath: string
): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download ${url}: ${resp.status}`);
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  writeFileSync(outputPath, buffer);
}
