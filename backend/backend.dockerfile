FROM node:22
WORKDIR /app
# Configure ENV variable
ENV PORT=3000
ENV JWT_SECRET="lcTz4M507jQO7gFuoglgIeDUktCgAfI0"
ENV YOUTUBE_APIKEY="AIzaSyBow8AE20MBT-b3BumI4V9TwVGbPUaetl8"
# Install ffmpeg and python
RUN apt-get -y update && \
    apt-get install -y python3.11 python3-pip python3.11-venv ffmpeg 
# Create virtual environment to run python
RUN python3.11 -m venv /opt/venv
# Install Whisper 
RUN /opt/venv/bin/pip install --upgrade pip &&  /opt/venv/bin/pip install -U openai-whisper
# Install yt-dlp
RUN /opt/venv/bin/pip install -U yt-dlp
# Create path for python environment
ENV PATH="/opt/venv/bin:$PATH"
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]