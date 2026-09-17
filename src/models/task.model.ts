// src/models/task.model.ts
import mongoose, { Document, Schema } from 'mongoose';

// Task 모델의 TypeScript 인터페이스 정의
export interface ITask extends Document {
    userId: string;
    name: string;
    requiredFocusScore: number; // Task를 완료하는 데 필요한 최소 집중도
    snoozeCount: number; // 누적된 지연 지수
    isCompleted: boolean;
    dependencies: string[]; // 기능 3을 위한 선후 관계
    // 재배치에 필요한 필드가 Task Model에 있어야 함
    startTime?: Date; 
    endTime?: Date;
    isScheduled?: boolean;
}

const TaskSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    requiredFocusScore: { type: Number, default: 50 },
    snoozeCount: { type: Number, default: 0 }, // 기본값 0
    isCompleted: { type: Boolean, default: false },
    dependencies: [{ type: String }],
    startTime: { type: Date },
    endTime: { type: Date },
    isScheduled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const RealTaskModel = mongoose.model<ITask>('Task', TaskSchema); // 실제 DB 사용 시 내보낼 객체

// 실제 DB 연결 없이 테스트하기 위해 Mongoose 모델 대신 Mock 객체로 대체
// 이 모킹을 통해 "task-001"과 같은 일반 문자열 ID를 사용할 수 있음.
const MockTaskModel: any = { 
    // findByIdAndUpdate: 지연 지수 업데이트 및 재배치 정보 업데이트 모킹
    findByIdAndUpdate: (id: string, update: any, options: any) => {
        console.log(`[MOCK DB] Task ${id} 업데이트 요청 (findByIdAndUpdate):`, update);
        return Promise.resolve({
            _id: id,
            requiredFocusScore: 70, // autoRescheduleTask에 필요한 mock 데이터 반환
            snoozeCount: 2,
        });
    },
    // findById: Task 정보 조회를 모킹
    findById: (id: string) => {
        console.log(`[MOCK DB] Task ${id} 조회 요청 (findById)`);
        return Promise.resolve({
            _id: id,
            requiredFocusScore: 70, 
            name: '미뤄진 업무',
            snoozeCount: 1
        });
    },
    // find: 사용자 과거 데이터 조회를 모킹
    find: (query: any) => {
        console.log(`[MOCK DB] Task 조회 요청 (find)`);
        return Promise.resolve([]); // 더미 데이터 배열 반환
    },
};

// MOCK_DB === 'true' 이면 MockTaskModel 사용 (테스트용)
const isMockingEnabled = process.env.MOCK_DB === 'true';
export const TaskModel = isMockingEnabled ? MockTaskModel : RealTaskModel;
