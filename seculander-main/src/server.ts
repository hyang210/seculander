import express, { Request, Response, Application } from 'express';
import * as dotenv from 'dotenv';
import { connectDB } from './config/mongodb';
import focusRoutes from './routes/focus.routes';
import taskRoutes from './routes/task.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(express.json()); // JSON 형식의 요청 본문을 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 형식 본문 파싱

// MongoDB 연결
connectDB();

// API 라우터 설정
app.use('/api/focus', focusRoutes);
app.use('/api/tasks', taskRoutes);

// 기본 라우트
app.get('/', (req: Request, res: Response) => {
    res.send('FocusFlow AI Backend 서버가 실행 중입니다.');
});

async function bootstrap() {
    await connectDB();
}

// 서버 시작
app.listen(PORT, () => {
    console.log(`[Server]: 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

bootstrap().catch((err) => {
  console.error('서버 부트스트랩 중 치명적 에러:', err);
  process.exit(1);
});