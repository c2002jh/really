# NeuroTune Backend Deployment Guide

This guide provides step-by-step instructions for deploying the NeuroTune backend to production.

## Pre-Deployment Checklist

- [ ] MongoDB instance set up and accessible
- [ ] Spotify API credentials obtained
- [ ] Production server provisioned (Linux recommended)
- [ ] Node.js v14+ installed on server
- [ ] Python 3 with NumPy installed on server
- [ ] Domain name configured (optional but recommended)
- [ ] SSL certificate obtained (Let's Encrypt recommended)

## Environment Setup

### 1. Server Preparation

Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
```

Install Node.js (if not already installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Install Python and NumPy:
```bash
sudo apt install -y python3 python3-pip
pip3 install numpy
```

Install MongoDB (if hosting locally):
```bash
# For Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Application Deployment

Clone or copy the backend code to the server:
```bash
cd /opt
sudo mkdir -p neurotune
sudo chown $USER:$USER neurotune
cd neurotune
# Upload your backend files here
```

Install dependencies:
```bash
cd backend
npm install --production
```

### 3. Environment Configuration

Create production `.env` file:
```bash
cp .env.example .env
nano .env
```

Configure the following variables:
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/neurotune
# Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/neurotune

# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_production_client_id
SPOTIFY_CLIENT_SECRET=your_production_client_secret

# File Upload Configuration
MAX_FILE_SIZE=10485760

# Python Configuration
PYTHON_COMMAND=python3

# CORS Configuration (set to your frontend domain)
CORS_ORIGIN=https://yourdomain.com
```

Secure the `.env` file:
```bash
chmod 600 .env
```

### 4. Process Manager Setup (PM2)

Install PM2 globally:
```bash
sudo npm install -g pm2
```

Create PM2 ecosystem file:
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'neurotune-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
}
EOF
```

Create logs directory:
```bash
mkdir -p logs
```

Start the application:
```bash
pm2 start ecosystem.config.js
```

Save PM2 configuration:
```bash
pm2 save
pm2 startup
# Follow the instructions printed by the command above
```

### 5. Nginx Reverse Proxy Setup

Install Nginx:
```bash
sudo apt install -y nginx
```

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/neurotune
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logging
    access_log /var/log/nginx/neurotune-access.log;
    error_log /var/log/nginx/neurotune-error.log;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # File upload size limit
        client_max_body_size 10M;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/neurotune /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate (Let's Encrypt)

Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

Obtain SSL certificate:
```bash
sudo certbot --nginx -d api.yourdomain.com
```

Auto-renewal is configured automatically. Test it:
```bash
sudo certbot renew --dry-run
```

### 7. Firewall Configuration

Configure UFW firewall:
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 8. MongoDB Security

Create admin user in MongoDB:
```javascript
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "strong_password_here",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

use neurotune
db.createUser({
  user: "neurotune_app",
  pwd: "app_password_here",
  roles: ["readWrite"]
})
exit
```

Enable authentication in MongoDB:
```bash
sudo nano /etc/mongod.conf
```

Add:
```yaml
security:
  authorization: enabled
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

Update `.env` with new connection string:
```env
MONGODB_URI=mongodb://neurotune_app:app_password_here@localhost:27017/neurotune?authSource=neurotune
```

Restart application:
```bash
pm2 restart neurotune-backend
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://api.yourdomain.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "NeuroTune API is running",
  "timestamp": "..."
}
```

### 2. Spotify Connection

```bash
curl https://api.yourdomain.com/api/auth/verify
```

### 3. Monitor Logs

View application logs:
```bash
pm2 logs neurotune-backend
```

View Nginx logs:
```bash
sudo tail -f /var/log/nginx/neurotune-access.log
sudo tail -f /var/log/nginx/neurotune-error.log
```

View MongoDB logs:
```bash
sudo tail -f /var/log/mongodb/mongod.log
```

### 4. Test Rate Limiting

Test that rate limiting is working:
```bash
# Should eventually return 429 Too Many Requests
for i in {1..250}; do
  curl -s https://api.yourdomain.com/api/health | grep success
done
```

## Monitoring and Maintenance

### Application Monitoring

Install PM2 monitoring:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

Check application status:
```bash
pm2 status
pm2 monit
```

### Database Backup

Create backup script:
```bash
cat > /opt/neurotune/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/neurotune/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://neurotune_app:app_password_here@localhost:27017/neurotune?authSource=neurotune" --out="$BACKUP_DIR/backup_$TIMESTAMP"
# Keep only last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x /opt/neurotune/backup.sh
```

Schedule daily backups with cron:
```bash
crontab -e
```

Add:
```
0 2 * * * /opt/neurotune/backup.sh >> /opt/neurotune/logs/backup.log 2>&1
```

### System Updates

Update application:
```bash
cd /opt/neurotune/backend
git pull  # or upload new files
npm install --production
pm2 restart neurotune-backend
```

Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
```

## Scaling Considerations

### Horizontal Scaling

For high traffic, consider:
1. Multiple backend instances behind a load balancer
2. MongoDB replica set for high availability
3. Redis for session storage and caching
4. CDN for static assets

### Vertical Scaling

Adjust PM2 instances:
```bash
pm2 scale neurotune-backend 4  # Scale to 4 instances
```

Increase MongoDB resources:
```bash
# Edit /etc/mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
```

## Troubleshooting

### Application Won't Start

Check logs:
```bash
pm2 logs neurotune-backend --err
```

Common issues:
- MongoDB connection failed: Check connection string in `.env`
- Port already in use: Change PORT in `.env`
- Permission denied: Check file permissions

### High Memory Usage

Check process memory:
```bash
pm2 monit
```

Restart application:
```bash
pm2 restart neurotune-backend
```

### Slow API Responses

Check MongoDB indexes:
```javascript
mongosh neurotune
db.userpreferences.getIndexes()
db.analysisresults.getIndexes()
```

Add indexes if needed:
```javascript
db.analysisresults.createIndex({ userId: 1, createdAt: -1 })
db.userpreferences.createIndex({ userId: 1 }, { unique: true })
```

### File Upload Issues

Check disk space:
```bash
df -h
```

Check upload directory permissions:
```bash
ls -la /opt/neurotune/backend/uploads
chmod 755 /opt/neurotune/backend/uploads
```

## Security Best Practices

1. **Keep secrets secure**: Never commit `.env` to version control
2. **Regular updates**: Keep all dependencies up to date
3. **Monitoring**: Set up error tracking (e.g., Sentry)
4. **Backups**: Automate regular database backups
5. **SSL/TLS**: Always use HTTPS in production
6. **Rate limiting**: Already configured, monitor for abuse
7. **Input validation**: All endpoints validate input
8. **MongoDB**: Use authentication and principle of least privilege
9. **Logs**: Regularly review application and system logs
10. **Audits**: Run security audits with `npm audit`

## Support

For issues or questions:
- Check logs: `pm2 logs neurotune-backend`
- Review documentation: `/opt/neurotune/backend/README.md`
- Test endpoints: See `TESTING.md`

## License

MIT
