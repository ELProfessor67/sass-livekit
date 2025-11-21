# Step-by-Step Server Setup Guide

This guide walks you through setting up the Nginx reverse proxy automation for whitelabel signups.

## Prerequisites

- Access to your Linux server (Ubuntu/Debian recommended)
- Sudo/root access
- Your project deployed on the server
- Domain DNS access

---

## Step 1: Make Script Executable

### On Your Server

1. **SSH into your server:**
   ```bash
   ssh your_username@your_server_ip
   ```

2. **Navigate to your project directory:**
   ```bash
   cd /path/to/your/project
   ```
   *(Replace `/path/to/your/project` with your actual project path, e.g., `/home/user/sass-livekit`)*

3. **Make the script executable:**
   ```bash
   chmod +x server/scripts/setup_reverse_proxy.sh
   ```

4. **Verify it worked:**
   ```bash
   ls -la server/scripts/setup_reverse_proxy.sh
   ```
   You should see `-rwxr-xr-x` (the `x` means executable)

---

## Step 2: Configure Sudo Permissions

This allows the script to run without a password prompt.

### Find Your Username

1. **Check your current username:**
   ```bash
   whoami
   ```
   *(Note this username - you'll need it in the next step)*

### Find Your Full Project Path

2. **Get the absolute path to your project:**
   ```bash
   pwd
   ```
   *(This shows your current directory path)*

3. **Get the full path to the script:**
   ```bash
   realpath server/scripts/setup_reverse_proxy.sh
   ```
   *(Example output: `/home/user/sass-livekit/server/scripts/setup_reverse_proxy.sh`)*

### Edit Sudoers File

4. **Open the sudoers file for editing:**
   ```bash
   sudo visudo
   ```
   ⚠️ **IMPORTANT**: Always use `visudo`, never edit `/etc/sudoers` directly!

5. **Scroll to the bottom of the file** (use arrow keys or `Page Down`)

6. **Add this line** (replace with your actual username and path):
   ```
   your_username ALL=(ALL) NOPASSWD: /home/user/sass-livekit/server/scripts/setup_reverse_proxy.sh
   ```
   
   **Example:**
   - If your username is `ubuntu` and project is at `/home/ubuntu/sass-livekit`:
     ```
     ubuntu ALL=(ALL) NOPASSWD: /home/ubuntu/sass-livekit/server/scripts/setup_reverse_proxy.sh
     ```
   
   - If your username is `deploy` and project is at `/var/www/sass-livekit`:
     ```
     deploy ALL=(ALL) NOPASSWD: /var/www/sass-livekit/server/scripts/setup_reverse_proxy.sh
     ```

7. **Save and exit:**
   - Press `Ctrl + X`
   - Press `Y` to confirm
   - Press `Enter` to save

8. **Test it works:**
   ```bash
   sudo bash server/scripts/setup_reverse_proxy.sh test.example.com 8080
   ```
   *(This should run without asking for a password. Press Ctrl+C to cancel after a few seconds)*

---

## Step 3: Set Environment Variables

### Find Your .env File

1. **Locate your .env file:**
   ```bash
   ls -la .env
   ```
   *(If it doesn't exist, create it: `touch .env`)*

2. **Open the .env file for editing:**
   ```bash
   nano .env
   ```
   *(Or use `vi .env` if you prefer)*

3. **Add or update these lines:**
   ```env
   MAIN_DOMAIN=frontend.ultratalkai.com
   FRONTEND_PORT=8080
   ```
   
   **Replace with your actual values:**
   - `MAIN_DOMAIN`: Your main domain (e.g., `frontend.ultratalkai.com`, `app.yourdomain.com`)
   - `FRONTEND_PORT`: Port your frontend runs on (default is `8080`)

4. **Save and exit:**
   - Press `Ctrl + X`
   - Press `Y` to confirm
   - Press `Enter` to save

5. **Verify the variables are set:**
   ```bash
   grep -E "MAIN_DOMAIN|FRONTEND_PORT" .env
   ```

### If Running as a Service (PM2/systemd)

If your Node.js app runs as a service, you may need to:

**For PM2:**
```bash
pm2 restart all
pm2 save
```

**For systemd:**
```bash
sudo systemctl restart your-service-name
```

---

## Step 4: Configure DNS (Wildcard or Individual)

You have two options:

### Option A: Wildcard DNS (Recommended)

This allows any subdomain to work automatically.

1. **Log into your DNS provider** (Cloudflare, AWS Route53, GoDaddy, etc.)

2. **Add a wildcard A record:**
   - **Type**: `A`
   - **Name**: `*` (asterisk)
   - **Value**: Your server's IP address
   - **TTL**: `300` (or default)

   **Example:**
   ```
   Type: A
   Name: *
   Value: 123.45.67.89
   TTL: 300
   ```

3. **Wait for DNS propagation** (5-30 minutes)

4. **Test wildcard DNS:**
   ```bash
   nslookup test.frontend.ultratalkai.com
   ```
   *(Should return your server IP)*

### Option B: Individual DNS Records

Add A records for each subdomain as users sign up.

1. **Log into your DNS provider**

2. **For each whitelabel signup, add an A record:**
   - **Type**: `A`
   - **Name**: `{slug}` (e.g., `demo`, `mycompany`)
   - **Value**: Your server's IP address
   - **TTL**: `300`

   **Example for slug "demo":**
   ```
   Type: A
   Name: demo
   Value: 123.45.67.89
   TTL: 300
   ```
   *(This creates `demo.frontend.ultratalkai.com`)*

---

## Step 5: Verify Everything Works

### Test the Script Manually

1. **Run the script manually with a test domain:**
   ```bash
   sudo bash server/scripts/setup_reverse_proxy.sh test.frontend.ultratalkai.com 8080
   ```

2. **Check for errors** - you should see:
   ```
   🚀 Setting up Nginx reverse proxy for test.frontend.ultratalkai.com on port 8080
   ✅ Nginx reverse proxy + SSL setup completed for https://test.frontend.ultratalkai.com
   ```

3. **Verify Nginx config was created:**
   ```bash
   ls -la /etc/nginx/sites-available/test.frontend.ultratalkai.com
   ```

4. **Check Nginx status:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

### Test a Real Signup

1. **Sign up with a whitelabel account** through your frontend

2. **Check server logs** for:
   ```
   🚀 Setting up Nginx reverse proxy for {slug}.frontend.ultratalkai.com on port 8080
   ✅ Nginx reverse proxy setup completed for {slug}.frontend.ultratalkai.com
   ```

3. **Verify the domain works:**
   ```bash
   curl -I https://{slug}.frontend.ultratalkai.com
   ```

---

## Troubleshooting

### Script Permission Denied

```bash
# Check script permissions
ls -la server/scripts/setup_reverse_proxy.sh

# Fix if needed
chmod +x server/scripts/setup_reverse_proxy.sh
```

### Sudo Still Asking for Password

1. **Check sudoers syntax:**
   ```bash
   sudo visudo -c
   ```

2. **Verify the path is correct:**
   ```bash
   realpath server/scripts/setup_reverse_proxy.sh
   ```

3. **Check your username:**
   ```bash
   whoami
   ```

### Certbot Fails

1. **Check DNS is configured:**
   ```bash
   nslookup {slug}.frontend.ultratalkai.com
   ```

2. **Wait for DNS propagation** (can take up to 48 hours, usually 5-30 minutes)

3. **Check if port 80 is open:**
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

### Environment Variables Not Working

1. **Check if .env is being loaded:**
   ```bash
   # In your Node.js app, add temporarily:
   console.log('MAIN_DOMAIN:', process.env.MAIN_DOMAIN);
   ```

2. **Restart your Node.js service:**
   ```bash
   pm2 restart all
   # or
   sudo systemctl restart your-service
   ```

### Nginx Config Not Created

1. **Check script output:**
   ```bash
   # Look in your Node.js logs for error messages
   ```

2. **Test script manually:**
   ```bash
   sudo bash server/scripts/setup_reverse_proxy.sh test.example.com 8080
   ```

---

## Quick Reference

### Common Commands

```bash
# Make script executable
chmod +x server/scripts/setup_reverse_proxy.sh

# Edit sudoers
sudo visudo

# Check DNS
nslookup {slug}.frontend.ultratalkai.com

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### File Locations

- Script: `server/scripts/setup_reverse_proxy.sh`
- Nginx configs: `/etc/nginx/sites-available/`
- Nginx enabled: `/etc/nginx/sites-enabled/`
- Environment file: `.env` (in project root)
- Sudoers file: `/etc/sudoers`

---

## Security Notes

1. **Only grant sudo for the specific script path** - don't use wildcards unless necessary
2. **Keep your .env file secure** - don't commit it to git
3. **Regularly update Nginx and Certbot** for security patches
4. **Monitor Nginx logs** for suspicious activity

---

## Need Help?

If you encounter issues:

1. Check the error messages in your Node.js logs
2. Test the script manually with `sudo bash server/scripts/setup_reverse_proxy.sh test.example.com 8080`
3. Verify DNS is configured correctly
4. Ensure all file permissions are correct

