
import { GoogleGenAI, Type } from "@google/genai";
import { Chess } from "chess.js";
import { GameDifficulty } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const DEFAULT_TIMEOUT_MS = 8000;

export interface ServiceResult<T> {
  data: T;
  usedFallback: boolean;
  fallbackReason?: string;
  durationMs: number;
  source: "api" | "fallback" | "cache";
  timedOut: boolean;
  aborted: boolean;
}

interface WithTimeoutOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  reason?: {
    timeout?: string;
    aborted?: string;
    error?: string;
  };
}

interface WithTimeoutResult<T> {
  data: T;
  usedFallback: boolean;
  fallbackReason?: string;
  durationMs: number;
  timedOut: boolean;
  aborted: boolean;
  error?: unknown;
}

type MovePayload = { move: string; commentary: string };

type CachedMoveEntry = ServiceResult<MovePayload>;

const moveCache = new Map<string, CachedMoveEntry>();

const DEFAULT_REASONS = {
  timeout: "Gemini timed out",
  aborted: "AI request cancelled",
  error: "Gemini failed",
};

const withTimeout = async <T>(
  action: (signal?: AbortSignal) => Promise<T>,
  fallbackFactory: () => T,
  options: WithTimeoutOptions = {}
): Promise<WithTimeoutResult<T>> => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, reason = {} } = options;
  const mergedReason = { ...DEFAULT_REASONS, ...reason };
  const supportsAbort = typeof AbortController !== "undefined";
  const controller = supportsAbort ? new AbortController() : undefined;
  const start = Date.now();

  let timedOut = false;
  let aborted = false;
  let fallbackReason: string | undefined;
  let externalAbortHandler: (() => void) | undefined;

  if (externalSignal && controller) {
    externalAbortHandler = () => {
      aborted = true;
      fallbackReason = mergedReason.aborted;
      controller.abort();
    };

    if (externalSignal.aborted) {
      externalAbortHandler();
    } else {
      externalSignal.addEventListener("abort", externalAbortHandler);
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    fallbackReason = mergedReason.timeout;
    controller?.abort();
  }, timeoutMs);

  try {
    const result = await action(controller?.signal ?? externalSignal);
    const durationMs = Date.now() - start;

    if (timedOut || aborted) {
      const data = fallbackFactory();
      return { data, usedFallback: true, fallbackReason, durationMs, timedOut, aborted };
    }

    return { data: result, usedFallback: false, durationMs, timedOut, aborted };
  } catch (error) {
    if (!fallbackReason) {
      fallbackReason = mergedReason.error;
    }
    const data = fallbackFactory();
    const durationMs = Date.now() - start;

    return { data, usedFallback: true, fallbackReason, durationMs, timedOut, aborted, error };
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener("abort", externalAbortHandler);
    }
  }
};

const evaluateFallbackMove = (
  fen: string,
  validMoves: string[],
  difficulty: GameDifficulty
): MovePayload => {
  if (!validMoves.length) {
    return {
      move: "",
      commentary: "I'm out of moves!"
    };
  }

  const game = new Chess(fen);
  const rankedMoves: { move: string; score: number }[] = [];

  validMoves.forEach((moveSan) => {
    const move = game.move(moveSan);
    if (!move) return;

    let score = 0;

    if (game.isCheckmate()) {
      score = 1000;
    } else if (game.inCheck()) {
      score = 100;
    } else if (move.captured) {
      const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score = 50 + (pieceValues[move.captured] || 0);
    } else if ((move.piece === "n" || move.piece === "b") && game.history().length < 10) {
      score = 12;
    } else {
      score = Math.random() * 5;
    }

    game.undo();

    rankedMoves.push({ move: moveSan, score });
  });

  if (!rankedMoves.length) {
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    return {
      move: randomMove,
      commentary: "Going with instinct!"
    };
  }

  rankedMoves.sort((a, b) => b.score - a.score);

  let selectedMove: string;
  if (difficulty === GameDifficulty.HARD) {
    selectedMove = rankedMoves[0].move;
  } else if (difficulty === GameDifficulty.MEDIUM) {
    const topMoves = rankedMoves.slice(0, Math.min(3, rankedMoves.length));
    selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)].move;
  } else {
    const halfIndex = Math.max(1, Math.ceil(rankedMoves.length / 2));
    const pool = rankedMoves.slice(0, halfIndex);
    selectedMove = pool[Math.floor(Math.random() * pool.length)].move;
  }

  return {
    move: selectedMove,
    commentary: "Quick thinking! (Backup strategy)"
  };
};

const getCacheKey = (difficulty: GameDifficulty, fen: string) => `${difficulty}__${fen}`;

export interface AIMoveResult extends ServiceResult<MovePayload> {}

export const getAIMove = async (
  fen: string,
  validMoves: string[],
  difficulty: GameDifficulty,
  history: string[],
  options: { signal?: AbortSignal } = {}
): Promise<AIMoveResult> => {
  const fallbackMove = evaluateFallbackMove(fen, validMoves, difficulty);

  if (!apiKey) {
    return {
      data: {
        move: fallbackMove.move,
        commentary: "I don't have a brain right now (Missing API Key), so I'm improvising!"
      },
      usedFallback: true,
      fallbackReason: "Missing API key",
      durationMs: 0,
      timedOut: false,
      aborted: false,
      source: "fallback"
    };
  }

  const cacheKey = getCacheKey(difficulty, fen);
  const cached = moveCache.get(cacheKey);
  if (cached) {
    return { ...cached, source: "cache", durationMs: 0 };
  }

  const modelName =
    difficulty === GameDifficulty.HARD ? "gemini-3-pro-preview" : "gemini-2.5-flash";

  const systemInstruction = `You are a Pokemon Trainer playing a game of Chess against a challenger.
CRITICAL: You are playing as the BLACK pieces.
The White pieces have just moved. It is now YOUR TURN (Black).

Your Persona: Competitive, slightly arrogant (like Gary Oak or Silver), but respects strong moves.

Input Data:
- FEN: Current board state.
- Valid Moves: List of all legal moves you can make.

Your Task:
1. Analyze the board based on the FEN.
2. Select the BEST move from the provided 'Valid Moves' list.
3. Provide a short, one-sentence commentary in character. Use Pokemon terminology (e.g., "Hyper Beam!", "It's super effective!", "I choose you!").

Difficulty Strategy:
- Easy: Play a random or weak developmental move.
- Medium: Play standard solid chess.
- Hard: Play the optimal engine move.

Response Format: JSON object with "move" (the SAN string) and "commentary".`;

  const runGeminiCall = async (): Promise<MovePayload> => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Current FEN: ${fen}\nMove History: ${history.slice(-10).join(", ")}\nValid Moves: ${JSON.stringify(
        validMoves
      )}\nDifficulty: ${difficulty}\n\nChoose your move (Black).`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            move: {
              type: Type.STRING,
              description: "The SAN string of the chosen move from the valid moves list."
            },
            commentary: {
              type: Type.STRING,
              description: "A short in-character comment about the move."
            }
          },
          required: ["move", "commentary"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(text);
    if (!validMoves.includes(parsed.move)) {
      throw new Error("Gemini returned an invalid move");
    }

    return parsed;
  };

  const result = await withTimeout(runGeminiCall, () => fallbackMove, {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    signal: options.signal,
    reason: {
      timeout: "Gemini timed out",
      aborted: "AI request cancelled",
      error: "Gemini had a hiccup"
    }
  });

  const source = result.usedFallback ? "fallback" : "api";
  const finalResult: AIMoveResult = {
    ...result,
    source
  };

  moveCache.set(cacheKey, finalResult);

  return finalResult;
};

export interface AIChatResult extends ServiceResult<string> {}

export const getAIChatResponse = async (
  userMessage: string,
  history: { role: "user" | "model"; text: string }[],
  options: { signal?: AbortSignal } = {}
): Promise<AIChatResult> => {
  if (!apiKey) {
    return {
      data: "I can't hear you! (Missing API Key)",
      usedFallback: true,
      fallbackReason: "Missing API key",
      durationMs: 0,
      timedOut: false,
      aborted: false,
      source: "fallback"
    };
  }

  const modelName = "gemini-2.5-flash";
  const fallbackResponse = "The communication link is down!";

  const result = await withTimeout(
    async () => {
      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction:
            "You are a Rival Pokemon Trainer (like Gary Oak) playing chess. You are arrogant but respect skill. Keep responses short (under 2 sentences) and witty. Use Pokemon puns.",
        },
        history: history.map((entry) => ({
          role: entry.role,
          parts: [{ text: entry.text }]
        }))
      });

      const response = await chat.sendMessage({ message: userMessage });
      return response.text || "...";
    },
    () => fallbackResponse,
    {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      signal: options.signal,
      reason: {
        timeout: "Chat timed out",
        aborted: "Chat request cancelled",
        error: "Gemini chat failed"
      }
    }
  );

  return {
    ...result,
    source: result.usedFallback ? "fallback" : "api"
  };
};

export const clearMoveCache = () => moveCache.clear();
