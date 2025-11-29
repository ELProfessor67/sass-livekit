# Nginx Reverse Proxy Setup Script

This script automatically configures Nginx reverse proxy with SSL for whitelabel subdomains.

## What It Does

When a user signs up with a whitelabel account and provides a slug, this script:

1. ✅ Installs Nginx (if not already installed)
2. ✅ Creates reverse-proxy config for the domain
3. ✅ Enables the site
4. ✅ Installs Certbot
5. ✅ Applies SSL automatically

## Files

- `setup_reverse_proxy.sh` - The bash script that configures Nginx
- Automatically executed from `server/routes/user.js` after whitelabel signup

## Server Setup Requirements

### 1. Make Script Executable

```bash
chmod +x server/scripts/setup_reverse_proxy.sh
```

### 2. Configure Sudo Permissions

The script needs sudo access to configure Nginx. Add this to `/etc/sudoers`:

```bash
sudo visudo
```

Add one of these lines (replace `your_username` with your actual username):

**Option 1: Specific script path**
```
your_username ALL=(ALL) NOPASSWD: /path/to/your/project/server/scripts/setup_reverse_proxy.sh
```

**Option 2: All scripts in directory** (less secure)
```
your_username ALL=(ALL) NOPASSWD: /path/to/your/project/server/scripts/*
```

**Option 3: If running as a service user** (e.g., `node` or `www-data`)
```
node ALL=(ALL) NOPASSWD: /path/to/your/project/server/scripts/setup_reverse_proxy.sh
```

### 3. Environment Variables

Make sure these are set in your `.env` file:

```env
MAIN_DOMAIN=frontend.ultratalkai.com  # Your main domain
FRONTEND_PORT=8080                    # Port your frontend runs on
```

### 4. DNS Configuration

**IMPORTANT**: Before the script runs, ensure DNS is configured:

- For subdomain `{slug}.{MAIN_DOMAIN}`, add an A record pointing to your server IP
- Example: If slug is `demo` and MAIN_DOMAIN is `frontend.ultratalkai.com`, add:
  - Type: A
  - Name: `demo`
  - Value: `your.server.ip.address`

Certbot will fail if DNS is not configured correctly.

## How It Works

1. User signs up with whitelabel and enters a slug (e.g., "demo")
2. Backend validates and saves the slug to database
3. Script is automatically executed with:
   - Domain: `{slug}.{MAIN_DOMAIN}` (e.g., `demo.frontend.ultratalkai.com`)
   - Port: `FRONTEND_PORT` (default: 8080)
4. Script runs in background (doesn't block signup response)
5. Nginx config is created and SSL certificate is issued

## Testing

1. Sign up with whitelabel account and slug
2. Check server logs for:
   - `🚀 Setting up Nginx reverse proxy for {domain} on port {port}`
   - `✅ Nginx reverse proxy setup completed for {domain}`
3. Verify Nginx config exists:
   ```bash
   ls -la /etc/nginx/sites-available/{domain}
   ```
4. Test the domain:
   ```bash
   curl -I https://{slug}.{MAIN_DOMAIN}
   ```

## Troubleshooting

### Script Not Found
- Verify script path: `server/scripts/setup_reverse_proxy.sh`
- Check file permissions: `ls -la server/scripts/setup_reverse_proxy.sh`

### Permission Denied
- Check sudoers configuration
- Test manually: `sudo bash server/scripts/setup_reverse_proxy.sh test.example.com 8080`

### Certbot Fails
- Ensure DNS A record is configured and propagated
- Check DNS: `nslookup {slug}.{MAIN_DOMAIN}`
- Wait a few minutes for DNS propagation

### Port Already in Use
- Verify frontend port in `FRONTEND_PORT` env variable
- Check what's running on that port: `sudo lsof -i :8080`

## Manual Execution

You can also run the script manually:

```bash
sudo bash server/scripts/setup_reverse_proxy.sh demo.frontend.ultratalkai.com 8080
```

## Notes

- Script runs asynchronously - signup completes immediately
- Nginx setup failures don't block user signup
- All output is logged to console
- SSL certificate is automatically renewed by Certbot


