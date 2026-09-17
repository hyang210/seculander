// src/controllers/focus_score.ts
import { Request, Response } from 'express';
import { focusAIService } from '../services/focus.ai.service';
import redis from '../config/redis';

const CACHE_TTL = Number(process.env.FOCUS_CACHE_TTL || '3600');

/**
 * 시간대별 Focus Score를 계산하여 반환(기능 1)
 * GET /api/focus/score/:userId
 */
export const getFocusScore = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId가 필요합니다.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `focus:${userId}:${today}`; 

    // 1) Redis 캐시조회
    const cached = await redis.get(cacheKey);
    if (cached) {
      const focusScores = JSON.parse(cached);
      return res.status(200).json({
        userId,
        date: today,
        focusScores,
        fromCache: true,
        message: 'Redis 캐시에서 시간대별 Focus Score를 불러왔습니다.',
      });
    }

    // 2) 캐시가 없으면 AI 서비스 호출
    const focusScores = await focusAIService.predictFocusTable(userId);

    // 3) 결과를 Redis에 저장
    await redis.set(cacheKey, JSON.stringify(focusScores), 'EX', CACHE_TTL);

    return res.status(200).json({
      userId,
      date: today,
      focusScores,
      fromCache: false,
      message: 'AI 모델(ml-kmeans + k-means + EMA)이 시간대별 Focus Score를 예측했습니다.',
    });
  } catch (err) {
    console.error('[getFocusScore] error:', err);
    res.status(500).json({ message: 'Focus Score 예측 중 오류가 발생했습니다.' });
  }
};