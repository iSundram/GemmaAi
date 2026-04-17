interface AIResponse {
  result?: {
    response?: string;
    choices?: Array<{
      text?: string;
    }>;
  };
}

const input = document.querySelector('textarea') as HTMLTextAreaElement;
const button = document.querySelector('button') as HTMLButtonElement;
const output = document.querySelector('#output') as HTMLDivElement;

// IMPORTANT: Replace this with your actual Worker URL
const WORKER_URL = "https://gemmaai.sundram5955a.workers.dev";

async function askGemma() {
  const prompt = input.value.trim();
  if (!prompt) return;

  // UI state updates
  button.disabled = true;
  output.innerHTML = '<span class="loading">Thinking...</span>';

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      // Use a simple request to avoid CORS preflight failures on basic Worker setups.
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error("Worker Error");

    const data: AIResponse = await response.json();
    const text =
      data.result?.response ??
      data.result?.choices?.[0]?.text;

    if (!text) throw new Error("Unexpected API response format");

    output.innerText = text;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not connect to Gemma.";
    output.innerText = `Error: ${message}`;
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

button.addEventListener('click', askGemma);
