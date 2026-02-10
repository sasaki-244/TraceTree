"""
アプリケーション設定
環境変数からデータベース接続情報などを読み込む
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""
    
    # データベース設定
    # 環境変数から読み込む（デフォルト値はローカル開発用のみ）
    DATABASE_URL: str = "postgresql+asyncpg://tracetree:tracetree@localhost:5432/tracetree"
    
    # アプリケーション設定
    APP_NAME: str = "TraceTree API"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"  # .envファイルから自動読み込み
        case_sensitive = True


# グローバル設定インスタンス
settings = Settings()
