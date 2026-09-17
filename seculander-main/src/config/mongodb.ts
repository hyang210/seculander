import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/focusflowdb';

export const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB에 성공적으로 연결되었습니다.');
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        // 서버 시작 전 DB 연결이 필수적이라면 프로세스를 종료
        process.exit(1); 
    }
};
