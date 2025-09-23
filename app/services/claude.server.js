/**
 * Claude Service
 * Manages interactions with the Claude API (defensive + clearer errors)
 */
import { Anthropic } from "@anthropic-ai/sdk";
import AppConfig from "./config.server";
import systemPrompts from "../prompts/prompts.json";

/**
 * Creates a Claude service instance
 * @param {string} apiKey - Claude API key. If omitted, will read from process.env.CLAUDE_API_KEY
 */
export function createClaudeService(apiKey = process.env.CLAUDE_API_KEY) {
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    const msg = "CLAUDE_API_KEY is not set. Set CLAUDE_API_KEY in environment variables.";
    console.error(msg);
    throw new Error(msg);
  }

  // Initialize Claude client
  const anthropic = new Anthropic({ apiKey });

  /**
   * Normalize messages into an array that Claude SDK expects.
   * Accepts null/undefined/strings and returns an array of `{ role, content }`.
   */
  function normalizeMessages(messages) {
    if (!messages) return [];
    if (!Array.isArray(messages)) {
      // If it's a single string or object, try to coerce
      if (typeof messages === "string") {
        return [{ role: "user", content: messages }];
      }
      // if it's object, attempt best-effort conversion
      if (typeof messages === "object") {
        return [messages];
      }
      return [];
    }
    return messages.map((m) => {
      // Ensure each message is an object with role & content
      if (!m || typeof m !== "object") {
        return { role: "user", content: String(m) };
      }
      // if content is an array/string/object, keep it (SDK may accept arrays for rich content)
      return {
        role: m.role || "user",
        content: m.content ?? m.text ?? ""
      };
    });
  }

  /**
   * Streams a conversation with Claude
   * @param {Object} params
   * @param {Array|undefined} params.messages
   * @param {string} params.promptType
   * @param {Array} params.tools
   * @param {Object} streamHandlers - { onText, onMessage, onToolUse, onContentBlock }
   */
  const streamConversation = async (
    { messages, promptType = AppConfig.api.defaultPromptType, tools },
    streamHandlers = {}
  ) => {
    // Defensive: coerce messages into an array, never null
    const safeMessages = normalizeMessages(messages);

    const systemInstruction = getSystemPrompt(promptType);

    try {
      // Create the stream - wrap in try so we can give a better error message
      const stream = await anthropic.messages.stream({
        model: AppConfig.api.defaultModel,
        max_tokens: AppConfig.api.maxTokens,
        system: systemInstruction,
        messages: safeMessages,
        tools: tools && tools.length > 0 ? tools : undefined
      });

      // Attach provided handlers if present
      if (streamHandlers.onText && typeof streamHandlers.onText === "function") {
        stream.on("text", streamHandlers.onText);
      }
      if (streamHandlers.onMessage && typeof streamHandlers.onMessage === "function") {
        stream.on("message", streamHandlers.onMessage);
      }
      if (streamHandlers.onContentBlock && typeof streamHandlers.onContentBlock === "function") {
        stream.on("contentBlock", streamHandlers.onContentBlock);
      }

      // Wait for final message from the stream
      const finalMessage = await stream.finalMessage();

      // finalMessage might be null in error cases — handle defensively
      if (!finalMessage) {
        const errMsg = "Claude stream ended without a final message (null finalMessage).";
        console.error(errMsg);
        throw new Error(errMsg);
      }

      // If the final message contains tool_use blocks, run onToolUse handler for each
      if (streamHandlers.onToolUse && typeof streamHandlers.onToolUse === "function" && Array.isArray(finalMessage.content)) {
        for (const contentBlock of finalMessage.content) {
          try {
            if (contentBlock && contentBlock.type === "tool_use") {
              // allow handler to run async
              await streamHandlers.onToolUse(contentBlock);
            }
          } catch (innerErr) {
            // don't break the loop; log and continue
            console.error("Error in onToolUse handler:", innerErr);
          }
        }
      }

      return finalMessage;
    } catch (error) {
      // Provide a clearer error surface so the rest of your app can react to it
      console.error("Error communicating with Claude API:", error && error.message ? error.message : error);
      // Re-throw a normalized error so callers won't see SDK internals unexpectedly
      const normalized = new Error(
        error && error.message ? `Claude API error: ${error.message}` : "Unknown error from Claude API"
      );
      normalized.original = error;
      throw normalized;
    }
  };

  const getSystemPrompt = (promptType) => {
    try {
      return (
        systemPrompts.systemPrompts?.[promptType]?.content ||
        systemPrompts.systemPrompts?.[AppConfig.api.defaultPromptType]?.content ||
        ""
      );
    } catch (e) {
      console.warn("Failed to load system prompt, falling back to empty string", e);
      return "";
    }
  };

  return {
    streamConversation,
    getSystemPrompt
  };
}

export default {
  createClaudeService
};
