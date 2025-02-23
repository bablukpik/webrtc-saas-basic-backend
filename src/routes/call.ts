import { Router } from 'express';
import { z } from 'zod';
import { ZodError } from 'zod';
import prisma from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Start a call
router.post('/start', async (req, res) => {
  const callSchema = z.object({
    initiatorId: z.string(),
    participantId: z.string(),
    callType: z.enum(['AUDIO', 'VIDEO', 'SCREEN_SHARE']),
  });

  try {
    const { initiatorId, participantId, callType } = callSchema.parse(req.body);
    const callId = uuidv4(); // Generate a unique Call ID

    const call = await prisma.callHistory.create({
      data: {
        id: callId, // Use the generated Call ID
        initiatorId,
        participantId,
        callType,
      },
    });

    res.status(201).json(call);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// End a call
router.post('/end', async (req, res) => {
  const endCallSchema = z.object({
    callId: z.string(),
  });

  try {
    const { callId } = endCallSchema.parse(req.body);
    const call = await prisma.callHistory.update({
      where: { id: callId },
      data: { endTime: new Date() },
    });

    res.json(call);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as callRouter };
