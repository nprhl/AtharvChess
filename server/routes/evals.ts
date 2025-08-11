import { Router } from 'express';
import { db } from '../db';
import { engineEvals, insertEngineEvalSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export const evals = Router();

evals.post('/', async (req, res) => {
  try {
    // Validate request body
    const validatedData = insertEngineEvalSchema.parse(req.body);
    const { fen, depth, engine, scoreCp, bestmove, pv } = validatedData;

    // Upsert the evaluation data
    const result = await db
      .insert(engineEvals)
      .values({
        fen,
        depth,
        engine,
        scoreCp,
        bestmove,
        pv,
      })
      .onConflictDoUpdate({
        target: [engineEvals.fen, engineEvals.depth, engineEvals.engine],
        set: {
          scoreCp: scoreCp,
          bestmove: bestmove,
          pv: pv,
        },
      })
      .returning();

    res.json({ ok: true, data: result });
  } catch (error) {
    console.error('Error saving engine evaluation:', error);
    res.status(400).json({ 
      error: 'Failed to save evaluation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get evaluations for a specific position
evals.get('/:fen', async (req, res) => {
  try {
    const { fen } = req.params;
    const { depth, engine } = req.query;

    let whereConditions = [eq(engineEvals.fen, fen)];

    if (depth) {
      whereConditions.push(eq(engineEvals.depth, parseInt(depth as string)));
    }

    if (engine) {
      whereConditions.push(eq(engineEvals.engine, engine as string));
    }

    const evaluations = await db
      .select()
      .from(engineEvals)
      .where(and(...whereConditions));

    res.json({ evaluations });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch evaluations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});