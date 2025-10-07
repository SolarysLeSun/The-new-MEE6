// src/app/api/ping/route.ts
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/ping:
 *   get:
 *     summary: Vérifie la disponibilité du panel web.
 *     description: Retourne une réponse simple pour les vérifications de latence et de disponibilité.
 *     responses:
 *       200:
 *         description: Le service est opérationnel.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: pong
 */
export function GET() {
  return NextResponse.json({ status: 'pong' });
}
