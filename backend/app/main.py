from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import trees

app = FastAPI(
    title="TraceTree API",
    description="HTB攻略ツリー管理API",
    version="0.1.0"
)

# CORS設定（フロントエンドからのアクセスを許可）
# 本番環境とローカル開発環境の両方を許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # ローカル開発
        "https://*.vercel.app",   # Vercelプレビュー
        "*"                        # 本番環境（デプロイ後に具体的なドメインに変更推奨）
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(trees.router)

@app.get("/")
async def root():
    """ヘルスチェック用エンドポイント"""
    return {"message": "TraceTree API is running"}
