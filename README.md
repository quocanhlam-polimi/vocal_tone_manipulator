### API

Install Python 3.12 on your machine

```

source venv/Scripts/activate
# or
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### WEB
```
npm run dev
```