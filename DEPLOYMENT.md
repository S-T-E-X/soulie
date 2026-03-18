# Soulie Deployment Rehberi

## 1. VPS'de Backend'i Güncelleme

### Adım 1: Yeni Kod Dosyalarını VPS'e Upload Edin

```bash
# Lokal makinenizde, proje root'unda:
scp -r server/ user@your-vps-ip:/path/to/soulie/
scp package.json package-lock.json user@your-vps-ip:/path/to/soulie/
```

### Adım 2: VPS'de Bağlantı Kurup Dependencies'i Yükleyin

```bash
# VPS'de SSH:
ssh user@your-vps-ip
cd /path/to/soulie

# Yeni paketleri kur (eğer package.json değiştiyse)
npm install

# Eski işlemi durdur (eğer varsa)
pm2 stop soulie-backend

# Yeni sürümle başlat
pm2 start "npm run server:dev" --name soulie-backend

# Logları kontrol et
pm2 logs soulie-backend
```

### Adım 3: Environment Variables Güncellemesi

Eğer yeni bir API key veya config eklediyseniz:

```bash
# VPS'de .env dosyasını edit et
nano /path/to/soulie/.env

# Değişiklikleri yaz (Ctrl+O, Enter, Ctrl+X)
# Sonra backend'i restart et
pm2 restart soulie-backend
```
# 1. Replit'te değişiklikler yaptın
# Replit Shell'de:
git add .
git commit -m "v1.0.1: yeni özellikler"
git push origin main
# 2. VPS'de SSH açıp çek:
ssh user@your-vps-ip
cd /path/to/soulie
git pull origin main
npm install          # eğer package.json değiştiyse
pm2 restart soulie-backend
---

## 2. Expo ile Yeni Build Alma

### iOS Build (App Store için)

```bash
# Lokal makinenizde proje root'unda:

# 1. Gerekli kütüphaneleri güncelle (eğer package.json değiştiyse)
npm install

# 2. App.json versiyonunu artır
# app.json'da "version": "X.Y.Z" (örneğin "1.0.0" → "1.0.1")

# 3. Build alma
eas build --platform ios

# 4. Build tamamlandıktan sonra status kontrol et
eas build:list

# 5. Build'i indir ve test et (Testflight)
eas build --platform ios --wait
```

### Android Build (Play Store için)

```bash
# Benzer adımlar, platform farklı:
eas build --platform android

# Build tamamlandığında:
eas build:list
```

### Her İki Platform İçin (Önerilir)

```bash
# Tek komutla her ikisini build et
eas build --platform all
```

---

## 3. App Store'a Submission (Yeni Build Upload)

### iOS - Testflight (Beta)

```bash
# Build EAS dashboard'dan tamamlandıktan sonra:
# 1. App Store Connect'e git: https://appstoreconnect.apple.com
# 2. Soulie uygulamasını seç
# 3. "TestFlight" → "Build" → İndir veya direkt Apple'a gönder
# 4. Test cihazlardaki Testflight uygulamasında yeni build göreceksin
```

### iOS - App Store (Canlı Yayın)

```bash
# Testflight'ta test ettikten sonra:
# 1. App Store Connect'e git
# 2. "My Apps" → "Soulie" 
# 3. "App Information" → Release Notes güncelleştir (ne değiştiği yaz)
# 4. "Build" sekmesinde Testflight build'ini seç
# 5. "Submit for Review" tıkla
# Apple review → 24-48 saat → Approved/Rejected

# Approved ise:
# 6. "Prepare for Submission" → "Release"
# 7. Hemen yayınlanır veya scheduled time'ı seç
```

### Android - Play Store

```bash
# Build tamamlandıktan sonra:
# 1. Google Play Console'a git: https://play.google.com/console
# 2. "Soulie" uygulamasını seç
# 3. "Create new release" → "Production" veya "Testing"
# 4. APK/Bundle'ı seç (EAS'tan indir)
# 5. Release Notes yaz
# 6. "Review release" → "Rollout to production"

# Google review → 2-3 saat → Live
```

---

## 4. Versiyon Yönetimi

### app.json'da Versiyon Güncelleme

```json
{
  "expo": {
    "name": "Soulie",
    "version": "1.0.2",
    "ios": {
      "buildNumber": "3"
    },
    "android": {
      "versionCode": 3
    }
  }
}
```

**Kural:**
- `version`: Semantic versioning (1.0.0, 1.0.1, 1.1.0, vb.)
- `buildNumber` (iOS): Sayısal, her build'de +1
- `versionCode` (Android): Sayısal, her build'de +1

---

## 5. Hızlı Kontrol Listesi

Yeni build almadan önce:

- [ ] `server/` dosyaları güncelledim
- [ ] `package.json` değişti ise `npm install` yaptım
- [ ] `.env` / API keys güncelle (gerekiyorsa)
- [ ] `app.json`'da versiyon artırdım
- [ ] Lokal test: `npm run dev` çalıştırıp sorun yokmu kontrol ettim
- [ ] Git commit yaptım: `git commit -m "v1.0.2: ..."`

---

## 6. Troubleshooting

### Build başarısız oldu

```bash
# Logs kontrol et
eas build:view --id <build-id>

# Genelde sorun:
# 1. Yanlış Apple Developer account
# 2. Provisioning profile süresi dolmuş
# 3. Pod cache → `eas build --platform ios --clear-cache`
```

### App Store submission rejected

- **Gözden geçir:** Rejection reason Email'ini oku
- **Düzelt:** Code update yap
- **Resubmit:** Yeni build al ve tekrar gönder

### VPS'de backend çalışmıyor

```bash
# PM2 kontrol et
pm2 status
pm2 logs soulie-backend

# Port açık mı?
netstat -tlnp | grep 5000

# Firewall rule ekle (gerekiyorsa)
sudo ufw allow 5000/tcp
```

---

## 7. CI/CD Otomasyonu (İleri Seviye)

GitHub Actions ile otomatik build alma:

```yaml
# .github/workflows/build.yml
name: Build APK and IPA

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: eas build --platform all --wait
```

```bash
# Kullanım: Git tag'ı push et
git tag v1.0.2
git push origin v1.0.2
# → Otomatik build başlar
```

---

## Özet Komutlar

| İşlem | Komut |
|-------|-------|
| Backend güncelleştir (VPS) | `scp -r server/ user@ip:/path/` + SSH + `npm install` + `pm2 restart` |
| Versiyon artır | Edit `app.json`, `version` + `buildNumber`/`versionCode` |
| iOS build al | `eas build --platform ios` |
| Android build al | `eas build --platform android` |
| App Store submit | App Store Connect → Build seç → "Submit for Review" |
| Play Store submit | Google Play Console → Build seç → "Publish" |
| Testflight testa gönder | EAS build tamamlanınca otomatik Testflight'a gider |

