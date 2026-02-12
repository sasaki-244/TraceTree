# Python 3.11のスリムイメージを使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー
COPY requirements.txt .

# pipとwheelを最新版に更新（セキュリティ修正）
RUN pip install --upgrade pip wheel>=0.46.2

# 依存関係をインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# 起動スクリプトに実行権限を付与
RUN chmod +x start.sh

# ポート8000を公開
EXPOSE 8000

# 起動スクリプトを実行
CMD ["./start.sh"]
