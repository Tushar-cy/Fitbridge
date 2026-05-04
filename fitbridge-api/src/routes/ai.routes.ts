import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { scanBody }     from '../controllers/aiScan.controller';
import Groq             from 'groq-sdk';
import { ENV }          from '../config/env';

const router = Router();
const groq   = new Groq({ apiKey: ENV.GROQ_API_KEY });

// ── POST /api/ai/analyze — body scan ─────────────────────────────────────────
router.post('/analyze', authenticate, scanBody);

// ── POST /api/ai/chat — AI trainer chatbot ────────────────────────────────────
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { trainerName, trainerSpeciality, userMessage, history = [] } = req.body as {
      trainerName: string;
      trainerSpeciality: string;
      userMessage: string;
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!userMessage?.trim()) {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    console.log(`[AI Chat] Trainer: ${trainerName} | Speciality: ${trainerSpeciality} | User: "${userMessage.slice(0, 60)}..."`);

    // System persona
    const systemPrompt = `You are an AI fitness assistant representing ${trainerName || 'a professional trainer'}, 
specialising in ${trainerSpeciality || 'general fitness'}.

Your role:
- Give short, crisp, actionable fitness advice (2-4 sentences max per reply)
- Focus on: workouts, nutrition, recovery, motivation, form tips
- Be warm, encouraging, and professional
- Never give medical diagnoses or prescription advice
- If asked something outside fitness, redirect back to fitness

Tone: Direct, motivating, like a real personal trainer talking to a client.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      // Inject conversation history (max last 10 messages)
      ...history.slice(-10),
      { role: 'user', content: userMessage.trim() },
    ];

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile', // Active Groq model (mixtral decommissioned)
      messages,
      max_tokens:  200,   // Keep replies short
      temperature: 0.75,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? 
      "I'm here to help! Can you tell me more about your fitness goal?";

    console.log(`[AI Chat] ✅ Reply: "${reply.slice(0, 80)}..."`);
    return res.json({ reply });

  } catch (err: any) {
    console.error('[AI Chat] Groq error:', err.message);

    // Graceful fallback — never crash the client
    const fallbacks = [
      "Great question! Focus on progressive overload — add 2.5kg each week to your lifts. 💪",
      "For fat loss: caloric deficit of 300-500 kcal/day + 3-4 strength sessions/week works best.",
      "Recovery is where gains happen. Aim for 7-9 hours of sleep and 0.8g protein/kg bodyweight.",
      "Consistency beats intensity every time. Show up 4x/week and trust the process! 🔥",
    ];
    const reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return res.json({ reply, fallback: true });
  }
});

export default router;
