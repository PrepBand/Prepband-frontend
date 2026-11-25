/// <reference lib="webworker" />
/** WebLLM runs the optional follow-up model off the main thread. */
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message: MessageEvent) => handler.onmessage(message);
