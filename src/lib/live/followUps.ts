/**
 * Choosing follow-up questions (FR-LIVE-09/12): four tiers.
 *
 *   1. Qwen2.5 1.5B Instruct  \
 *   2. SmolLM2 1.7B Instruct   } in-browser via WebLLM, WebGPU only, opt-in
 *   3. Llama 3.2 1B Instruct  /
 *   4. Examiner script        - always available, instant
 *
 * Guardrail: a model only ever answers with the *number* of one of the
 * admin-written follow-ups (or 0 for none). Anything else, or anything
 * slower than 2.5 s, falls back to the script's choice. Models never write
 * questions, never see more than the current question and answer, and
 * never score.
 */

import { MODEL_IDS, type TierId } from "./catalog";
import { withTimeout } from "./capabilities";

export type FollowUpRequest = {
  part: 1 | 2 | 3;
  question: string;
  transcript: string | null;
  options: string[];
};

export interface FollowUpChooser {
  readonly id: TierId;
  /** Index into options, or null for "no follow-up". */
  choose(request: FollowUpRequest, fallbackIndex: number | null): Promise<number | null>;
}

/** Tier 4: the script's own choice, passed through unchanged. */
export const scriptChooser: FollowUpChooser = {
  id: "script",
  choose: async (_request, fallbackIndex) => fallbackIndex,
};

type ChatEngine = {
  chat: {
    completions: {
      create: (request: {
        messages: { role: "system" | "user"; content: string }[];
        temperature: number;
        max_tokens: number;
      }) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
  unload: () => Promise<void>;
};

const SYSTEM_PROMPT =
  "You help an IELTS speaking examiner. Given the question asked, the candidate's answer and a numbered list of follow-up questions, reply with only the number of the follow-up that most naturally continues the conversation, or 0 if the answer already covers all of them. Reply with a single number and nothing else.";

/** Parses the model's reply; only a listed number counts. */
export function parseChoice(reply: string, optionCount: number): number | null | "invalid" {
  const match = reply.trim().match(/^\D*(\d{1,2})/);
  if (!match) return "invalid";
  const n = Number(match[1]);
  if (n === 0) return null;
  if (n >= 1 && n <= optionCount) return n - 1;
  return "invalid";
}

class WebLlmChooser implements FollowUpChooser {
  constructor(
    readonly id: TierId,
    private readonly engine: ChatEngine,
  ) {}

  async choose(request: FollowUpRequest, fallbackIndex: number | null): Promise<number | null> {
    if (!request.transcript || request.options.length === 0) return fallbackIndex;
    const list = request.options.map((option, i) => `${i + 1}. ${option}`).join("\n");
    const user = `Question: ${request.question}\nCandidate's answer: ${request.transcript.slice(0, 1200)}\nFollow-up questions:\n${list}`;
    try {
      const reply = await withTimeout(
        this.engine.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: user },
          ],
          temperature: 0,
          max_tokens: 4,
        }),
        2500,
        "Follow-up model",
      );
      const choice = parseChoice(reply.choices[0]?.message.content ?? "", request.options.length);
      return choice === "invalid" ? fallbackIndex : choice;
    } catch {
      return fallbackIndex;
    }
  }
}

export type FollowUpStatus = {
  active: TierId;
  loading: TierId | null;
  progress: number | null;
  note?: string;
  failures: { id: TierId; reason: string }[];
};

const MODEL_FOR: Partial<Record<TierId, string>> = {
  qwen: MODEL_IDS.qwen,
  smollm: MODEL_IDS.smollm,
  llama: MODEL_IDS.llama,
};

/**
 * Loads the language-model tiers in order (only when the student opted in
 * on a WebGPU device). Until one is ready, and if all fail, the script
 * chooses.
 */
export async function loadFollowUpChooser(
  order: TierId[],
  onStatus: (status: FollowUpStatus) => void,
): Promise<FollowUpChooser> {
  let status: FollowUpStatus = { active: "script", loading: null, progress: null, failures: [] };
  const emit = (update: Partial<FollowUpStatus>) => {
    status = { ...status, ...update };
    onStatus(status);
  };
  for (const id of order) {
    const modelId = MODEL_FOR[id];
    if (!modelId) break; // reached the script tier
    emit({ loading: id, progress: 0 });
    let worker: Worker | null = null;
    try {
      const webllm = await import("@mlc-ai/web-llm");
      worker = new Worker(new URL("./workers/llm.worker.ts", import.meta.url), { type: "module" });
      const engine = (await withTimeout(
        webllm.CreateWebWorkerMLCEngine(worker, modelId, {
          initProgressCallback: (report: { progress: number; text: string }) => emit({ progress: report.progress, note: report.text }),
        }),
        10 * 60 * 1000,
        "Loading",
      )) as unknown as ChatEngine;
      emit({ active: id, loading: null, progress: null, note: undefined });
      return new WebLlmChooser(id, engine);
    } catch (error) {
      worker?.terminate();
      emit({ failures: [...status.failures, { id, reason: error instanceof Error ? error.message : String(error) }] });
    }
  }
  emit({ active: "script", loading: null, progress: null, note: undefined });
  return scriptChooser;
}
