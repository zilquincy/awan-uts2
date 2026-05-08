# Dockerfile (di root project)
FROM python:3.11-slim

WORKDIR /app

# Copy requirements dan install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy semua file aplikasi
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Set working directory ke backend
WORKDIR /app/backend

# Environment variables (akan di-override oleh ECS Task Definition)
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

EXPOSE 5000

# Jalankan dengan Gunicorn (production-grade)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]