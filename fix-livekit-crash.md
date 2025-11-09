# Fix LiveKit Process Crashes (Exit Code -6)

## Problem
The LiveKit agent is crashing with exit code -6 during initialization due to missing system libraries:
```
implib-gen: libva-drm.so.2: failed to load library 'libva-drm.so.2' via dlopen: libva-drm.so.2: cannot open shared object file: No such file or directory
```

## Solution
Install the required VA-API and media codec libraries on your Ubuntu server.

### Commands to Run on Server

SSH into your server and run:

```bash
# Update package list
apt-get update

# Install VA-API libraries and related dependencies
apt-get install -y \
    libva-drm2 \
    libva2 \
    libdrm2 \
    libdrm-intel1 \
    libdrm-amdgpu1 \
    libdrm-common \
    libdrm-nouveau2 \
    libdrm-radeon1

# Also install additional media codec libraries that might be needed
apt-get install -y \
    libva-x11-2 \
    libva-glx2 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxfixes3

# Verify installation
ldconfig -p | grep libva
```

### Alternative: Minimal Installation (if above doesn't work)
```bash
# Install only the essential library
apt-get install -y libva-drm2
ldconfig
```

### Restart LiveKit Service
After installing the libraries, restart the LiveKit PM2 service:

```bash
cd ~/sass-livekit
pm2 restart livekit
pm2 logs livekit
```

## Why This Happens
The LiveKit FFI server (Foreign Function Interface) uses native libraries for video/audio processing. The `libva-drm.so.2` library is part of the Video Acceleration API (VA-API) which provides hardware-accelerated video decoding capabilities. While this might not be essential for your voice agent, the FFI initialization process requires it to be present.

## Verification
After installation, check the logs:
```bash
pm2 logs livekit --lines 50
```

You should no longer see the `libva-drm.so.2` error, and the process should initialize successfully.

## Notes
- This is a **server environment** issue, not a code issue
- The crash happens during FFI server initialization
- These are standard Ubuntu packages and safe to install
- If errors persist, you may also need to install build tools: `apt-get install -y build-essential`







