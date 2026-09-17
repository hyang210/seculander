FROM node:20

WORKDIR /app

# 1) 패키지 정보 복사 및 설치
COPY package*.json ./
ENV npm_config_loglevel=warn \
    npm_config_fund=false
RUN npm install --no-audit --no-fund

# 4) 앱 소스 복사
COPY . .

# 5) 실행
CMD ["npm", "run", "dev"]
