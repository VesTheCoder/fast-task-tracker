FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY src/main.py ./main.py
COPY src/settings.py ./settings.py

EXPOSE 6969

CMD ["python", "src/main.py"] 