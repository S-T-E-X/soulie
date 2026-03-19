# Soulie — VPS Deployment Guide

VPS bilgileri: `api.cszone.gg` | `/home/soulie` | PM2: `soulie-backend` | Port: 5000

---

## 1. Sunucu Gereksinimleri

- Ubuntu 20.04+ / Debian 11+
- Node.js 18+ (`nvm install 18 && nvm use 18`)
- PostgreSQL 14+
- PM2 (`npm install -g pm2`)
- Nginx
- Certbot (SSL için)

---

## 2. İlk Kurulum (sadece bir kez)

```bash
# Repoyu çek
cd /home/soulie
git clone <repo-url> .

# Bağımlılıkları kur
npm install

# .env dosyası oluştur (aşağıdaki değerleri doldur)
cp .env.example .env
nano .env
```

### .env Değerleri

```env
DATABASE_URL=postgresql://soulie:PAROLA@localhost:5432/soulie_db
NODE_ENV=production
OPENAI_API_KEY=sk-...
APPLE_TEAM_ID=T9GD8V3M6C
APPLE_KEY_ID=794S8ZUCK6
APPLE_SERVICE_ID=com.soulie.loginbaba
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8Kyanh5tY+WLwV5
qoXeiQVpeiD7Rv3+psPmC+wcIpGgCgYIKoZIzj0DAQehRANCAASSph4AcSfqPpgi
OntFyyqWV+C6Cd6bGM0vgIXt+nbPn7YyZ3S69OiNgpWCmxpQtboVDdzKCn3enK/T
uiedoH74
-----END PRIVATE KEY-----"
```

---

## 3. PostgreSQL Kurulumu

```bash
# PostgreSQL kur
sudo apt install postgresql postgresql-contrib -y

# DB ve kullanıcı oluştur
sudo -u postgres psql
```

```sql
CREATE USER soulie WITH PASSWORD 'yusufbabasikeratar3131';
CREATE DATABASE soulie_db OWNER soulie;
GRANT ALL PRIVILEGES ON DATABASE soulie_db TO soulie;
\q
```

---

## 4. Veritabanı Migrasyonu

```bash
# Migration dosyasını çalıştır
psql "postgresql://soulie:yusufbabasikeratar3131@localhost:5432/soulie_db" -f vps-migration.sql
```

---

## 5. Backend'i PM2 ile Başlat

```bash
# Backend'i build et ve başlat
cd /home/soulie
npm run build          # TypeScript derleme (varsa)
pm2 start ecosystem.config.js  # veya:
pm2 start "npm run server:start" --name soulie-backend

# PM2'yi sistem açılışında otomatik başlat
pm2 startup
pm2 save
```

### Güncelleme (her deploy'da çalıştır)

```bash
cd /home/soulie
git pull origin main
npm install
pm2 restart soulie-backend
```

---

## 6. Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/soulie
```

```nginx
server {
    listen 80;
    server_name api.cszone.gg;

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
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/soulie /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. SSL (HTTPS) — Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.cszone.gg
sudo systemctl reload nginx
```

Sertifika otomatik yenilenir. Kontrol et:

```bash
sudo certbot renew --dry-run
```

---

## 8. iOS App — EAS Build & App Store

```bash
# Yerel makinede (Mac gerekli değil, CI/CD)
npm install -g eas-cli
eas login

# Production build
eas build --platform ios --profile production

# Build bitti mi kontrol et
eas build:list

# App Store'a gönder
eas submit --platform ios
```

### app.json — önemli alanlar

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.soulie",
      "buildNumber": "8",         ← her submit'te artır
      "usesAppleSignIn": true
    },
    "extra": {
      "domain": "https://api.cszone.gg"
    }
  }
}
```

---

## 9. Apple Developer Portal Kontrol Listesi

Apple Sign-in çalışması için:

- [ ] App ID'de **Sign In with Apple** capability aktif (`com.soulie`)
- [ ] Service ID oluşturuldu: `com.soulie.loginbaba`  
  - Return URL: `https://api.cszone.gg/api/auth/apple-callback`
- [ ] Apple Server Notifications URL: `https://api.cszone.gg/api/notifications/apple`
- [ ] Private Key indirildi ve `.env`'ye eklendi

---

## 10. Özet — Hızlı Deploy

```bash
cd /home/soulie
git pull origin main
npm install
pm2 restart soulie-backend
pm2 logs soulie-backend --lines 50
```

Loglar temizse uygulamanız güncel. 🚀
