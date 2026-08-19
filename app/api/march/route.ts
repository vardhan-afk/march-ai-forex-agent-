import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are March, a JARVIS-style AI trading assistant built into Vardhan's personal forex dashboard, "forex-jarvis."

About Vardhan:
- Self-taught, multidisciplinary: algorithmic trading (MQL5/Pine Script), full-stack development, AI agent building
- Deep focus on XAUUSD (gold) trading and prop firm challenges (Goat Funded Trader, NYS Markets)
- Has built multiple MQL5 Expert Advisors (Zone Recovery Flip, Range Breakout, JadeCap ICT, Gold Session Scalp, and others)
- Comfortable with technical trading concepts (ATR, order flow, liquidity sweeps, session filters) — don't over-explain basics unless asked
- Prefers direct, concise answers over long-winded explanations

Do not open replies with stock phrases like "Systems online," "Systems operational," or similar boilerplate greetings. Just answer the question directly, every time — no preamble, no filler opener.

Your job: when asked about market conditions, prices, news, or events, use the available tools to fetch real live data before answering. CRITICAL RULE: you may only reference specific facts, headlines, numbers, or events that appear VERBATIM or near-verbatim in the tool data returned to you. Do not embellish, add extra detail, add extra events, add extra numbers, or invent a more dramatic or complete-sounding version of any headline. If a headline says "progress on X," report it as progress on X — do not reinterpret it as escalation, conflict, or crisis. If asked why something moved and the news data doesn't clearly explain it, say plainly that the cause isn't clear from available data. When summarizing news, stay close to paraphrasing the actual headlines you were given — do not add supporting details, statistics, or context that weren't in the tool output. Keep responses conversational and to the point.
Available tools:
- getPrices: current prices for all pairs and gold
- getNews: latest forex news headlines
- getCalendarEvents: upcoming economic calendar events
- getPairDetail: full detail for one specific pair (price, historical trend, related events, related news) — use this when the boss asks specifically about one pair like EURUSD or XAUUSD
- getSpeeches: recent central bank speeches from the Fed, ECB, and Bank of England — use this when the boss asks about central bank commentary, what a Fed/ECB/BOE official has said, or Fedspeak in general. IMPORTANT: this tool only returns speech titles, speaker names, sources, and dates — it does NOT return the actual content or text of what was said. Never invent, guess, or paraphrase what a speech might have argued, quoted, or concluded. Only report the title, speaker, and date, and tell the boss to check the source link for the actual content if he wants specifics.`;

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'getPrices',
        description: 'Get current live prices for all tracked forex pairs and gold (XAUUSD), including percent change.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'getNews',
        description: 'Get the latest forex-related news headlines.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'getCalendarEvents',
        description: 'Get upcoming economic calendar events (central bank meetings, data releases, etc).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'getPairDetail',
        description: 'Get full detail for one specific currency pair or gold, including current price, historical trend, and related news/events.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            symbol: {
              type: SchemaType.STRING,
              description: 'The pair symbol, e.g. EURUSD, GBPUSD, XAUUSD',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'getSpeeches',
        description: 'Get recent central bank speeches from the Fed, ECB, and Bank of England, including speaker name and title.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
    ],
  },
];

// Trims large tool results down before they get stringified into the
// conversation sent to Gemini. Sending full unbounded arrays (all news,
// all calendar events, all speeches) burns through the free tier's
// per-minute input-token quota very quickly, especially across multiple
// tool-call rounds in one exchange.
function trimForModel(name: string, data: any) {
  if (Array.isArray(data)) {
    const limits: Record<string, number> = {
      getNews: 8,
      getCalendarEvents: 10,
      getSpeeches: 8,
      getPrices: 20,
    };
    const limit = limits[name] ?? 15;
    return data.slice(0, limit);
  }
  if (data && typeof data === 'object' && Array.isArray(data.historical)) {
    return {
      ...data,
      historical: data.historical.slice(-60),
      events: Array.isArray(data.events) ? data.events.slice(0, 5) : data.events,
      news: Array.isArray(data.news) ? data.news.slice(0, 5) : data.news,
    };
  }
  return data;
}

async function callTool(name: string, args: any, baseUrl: string) {
  let result: any;
  if (name === 'getPrices') {
    const res = await fetch(`${baseUrl}/api/prices`);
    result = await res.json();
  } else if (name === 'getNews') {
    const res = await fetch(`${baseUrl}/api/news`);
    result = await res.json();
  } else if (name === 'getCalendarEvents') {
    const res = await fetch(`${baseUrl}/api/calendar`);
    result = await res.json();
  } else if (name === 'getPairDetail') {
    const res = await fetch(`${baseUrl}/api/pair/${args.symbol}`);
    result = await res.json();
  } else if (name === 'getSpeeches') {
    const res = await fetch(`${baseUrl}/api/speeches`);
    result = await res.json();
  } else {
    return { error: 'Unknown tool' };
  }
  return trimForModel(name, result);
}

// Gemini's free tier returns a 429 with this shape when the per-minute
// input-token quota is exceeded. We check for it specifically so the
// person gets a clear, honest message instead of a generic crash.
function isRateLimitError(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  const message = String(err?.message ?? '');
  return status === 429 || message.includes('429') || message.toLowerCase().includes('too many requests');
}

function isServerOverloadedError(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  const message = String(err?.message ?? '');
  return status === 503 || message.includes('503') || message.toLowerCase().includes('service unavailable') || message.toLowerCase().includes('overloaded');
}
  
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const baseUrl = request.nextUrl.origin;

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: SYSTEM_PROMPT,
      tools,
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(message);
    let response = result.response;

    for (let i = 0; i < 3; i++) {
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const call = functionCalls[0];
      const toolResult = await callTool(call.name, call.args, baseUrl);

      const followUp = `Here is the live data you requested from ${call.name} (JSON): ${JSON.stringify(toolResult)}\n\nUsing this real data, continue answering the original question naturally, in character, without mentioning JSON or raw data formatting. If you need another tool to fully answer, call it now.`;

      result = await chat.sendMessage(followUp);
      response = result.response;
    }

    const reply = response.text();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('March API error:', err);

    if (isRateLimitError(err)) {
      return NextResponse.json(
        {
          reply:
            "I've hit a temporary rate limit on my end boss — give it about thirty seconds and try again.",
        },
        { status: 200 }
      );
    }

    if (isServerOverloadedError(err)) {
      return NextResponse.json(
        {
          reply:
            "Gemini's servers are overloaded on their end right now boss, not us — try again in a moment.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: 'March failed to respond' }, { status: 500 });
  }
}