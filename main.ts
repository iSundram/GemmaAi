// Define the structure of our expected response
interface AIResponse {
  result: {
    response: string;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error("Worker Error");

    const data: AIResponse = await response.json();
    output.innerText = data.result.response;
  } catch (error) {
    output.innerText = "Error: Could not connect to Gemma.";
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

button.addEventListener('click', askGemma);
