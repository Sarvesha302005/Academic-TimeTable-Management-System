# ============================================
# Backend Dockerfile (Node.js + Python)
# ============================================
# The backend needs both Node.js (Express API) and Python 3
# (OR-Tools scheduler) since it spawns the scheduler as a
# child process during timetable generation.
# ============================================

FROM node:20-slim

# ---- Install Python 3 & pip ----
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-venv && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Install Python dependencies (scheduler) ----
COPY python-scheduler/requirements.txt ./python-scheduler/requirements.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages \
    -r python-scheduler/requirements.txt

# ---- Install Node.js dependencies ----
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Copy application source ----
COPY . .

# ---- Expose port & start ----
EXPOSE 5050

CMD ["node", "server.js"]
