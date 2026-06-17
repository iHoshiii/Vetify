from fastapi import FastAPI

app = FastAPI(title="Vetify API")

@app.get("/")
async def root():
    return {"message": "Welcome to Vetify API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
