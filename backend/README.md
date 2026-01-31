# TraceTree Backend

## セットアップ

### Poetryを使う場合
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

### pipを使う場合
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 実行

サーバーは http://localhost:8000 で起動します。

- API仕様: http://localhost:8000/docs
- ヘルスチェック: http://localhost:8000/
