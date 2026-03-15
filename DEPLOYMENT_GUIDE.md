# Soulie — VPS Deployment & App Store Yayınlama Rehberi

**Bu rehber:** Hiç deneyimi olmayan birisinin Soulie uygulamasını kendi VPS sunucusunda çalıştırması ve App Store / Google Play'e yayınlaması için adım adım talimatlar içerir.

---

## 📋 İçindekiler

1. [Genel Akış ve Sıralama](#genel-akış-ve-sıralama)
2. [Ön Hazırlık ve Gerekli Hesaplar](#ön-hazırlık-ve-gerekli-hesaplar)
3. [Aşama 1: VPS Seçimi ve İşletim Sistemi](#aşama-1-vps-seçimi-ve-işletim-sistemi)
4. [Aşama 2: VPS Kurulumu](#aşama-2-vps-kurulumu)
5. [Aşama 3: Backend Uygulamasını VPS'e Taşıma](#aşama-3-backend-uygulamasını-vpsye-taşıma)
6. [Aşama 4: Database Kurulumu](#aşama-4-database-kurulumu)
7. [Aşama 5: App Store / Google Play Build Alma](#aşama-5-app-store--google-play-build-alma)
8. [Aşama 6: App Store Connect Kurulumu (iOS)](#aşama-6-app-store-connect-kurulumu-ios)
9. [Aşama 7: Google Play Console Kurulumu (Android)](#aşama-7-google-play-console-kurulumu-android)
10. [Aşama 8: In-App Purchase (IAP) Kurulumu](#aşama-8-in-app-purchase-iap-kurulumu)
11. [Aşama 9: Uygulamayı App Store / Play Store'a Gönder](#aşama-9-uygulamayı-app-store--play-storea-gönder)
12. [Sorun Giderme](#sorun-giderme)

---

## 🎯 Genel Akış ve Sıralama

**Bu sırada yapılacak:**

```
1. ✅ Ön Hazırlık (Apple Developer, Google Play hesapları)
2. ✅ VPS Satın Al ve Kurulum Yap (İS: Ubuntu 22.04)
3. ✅ Backend'i VPS'e Taşı ve Çalıştır
4. ✅ Database Kurulumu (PostgreSQL VPS'de)
5. ✅ Domain Al ve DNS Ayarla
6. ✅ Uygulamada VPS Adresini Güncelle
7. ✅ iOS Build Al (EAS Build)
8. ✅ Android Build Al (EAS Build)
9. ✅ App Store Connect'e iOS Gönder
10. ✅ Google Play Console'a Android Gönder
11. ✅ In-App Purchase (IAP) Konfigüre Et
12. ✅ App Store / Play Store Onayı Bekle (3-5 gün)
```

**ÖNEMLİ:** VPS ve backend hazır olmadan, uygulamayı yayınlaman bir çoğunlukla başarısız olacaktır çünkü AI chat, character sistem ve diğer özellikleri backend'e bağlı.

---

## 💳 Ön Hazırlık ve Gerekli Hesaplar

### Gerekli Hesaplar

| Hesap | Maliyet | Ne İçin | URL |
|---|---|---|---|
| **Apple Developer** | $99/yıl | iOS App Store | developer.apple.com |
| **Google Play Developer** | $25 (bir kere) | Android Play Store | play.google.com/console |
| **Expo Account** | Ücretsiz | Build & Deployment | expo.dev |
| **VPS Sağlayıcı** | ~€5-15/ay | Sunucu | hetzner.com, digitalocean.com |
| **Domain** | ~€10/yıl | Sunucu adresi | namecheap.com, godaddy.com |

### Kullanıcı Bilgilerini Toplayın

Başlamadan önce, şunları hazırla:
- ✅ Apple ID (Apple Developer hesabı için)
- ✅ Kredi kartı (Apple $99, Google $25, VPS ödeme için)
- ✅ E-mail adresi (tüm hesaplar için)
- ✅ Telefon (Apple 2FA için)

---

## 🖥️ Aşama 1: VPS Seçimi ve İşletim Sistemi

### VPS Nedir?

VPS = **Virtual Private Server** = Kendi sunucun demek. Hetzner, DigitalOcean, vb. şirketler sunucu kiralıyor. Bu sunucuda backend kod çalışacak ve veritabanı depolanacak.

### İşletim Sistemi: Ubuntu 22.04 LTS

**Neden Ubuntu?** 
- Ücretsiz
- Linux tabanlı (çoğu sunucu Ubuntu kullanır)
- Node.js uygulamalar için ideal
- Kolay kurulum

### Önerilen VPS Özellikleri

```
├─ CPU: 2 vCore (2 işlemci)
├─ RAM: 2 GB 
├─ Disk: 20 GB SSD
├─ Bant genişliği: 1 Mbps veya daha fazla
└─ Aylık maliyet: €5-10
```

### VPS Satın Alma (Hetzner Örneği)

1. https://www.hetzner.com/cloud/ git
2. **Sign Up** → Email ile kayıt ol
3. **Kredi kartı** ekle
4. **Create Project** → "Soulie" yaz
5. **Add Server** kısaca:
   - **OS:** Ubuntu 22.04
   - **Type:** CPX11 (2 vCore, 2GB RAM)
   - **Location:** Tercihen Türkiye'ye yakın (Helsinki)
   - **Hostname:** soulie-backend
   - Bir SSH key oluştur (aşağıda anlatılacak) veya şifre ile devam et
6. **Create & Buy Now**

Sunucun başlatıldığında bir **IP adresi** verilecek (örn: `45.123.45.67`).

---

## 🔧 Aşama 2: VPS Kurulumu

### 2.1 Sunucuya Bağlan

**Windows'ta:**
- PuTTY indir: https://www.putty.org/
- Host: `45.123.45.67` (senin IP adresin)
- Port: 22
- Connect

**Mac/Linux'ta:**
```bash
ssh root@45.123.45.67
# Parola sor (Hetznel'in gönderdiği), gir
```

### 2.2 Temel Sistem Güncellemeleri

```bash
# Sistem güncellemeleri
apt update && apt upgrade -y

# Gerekli araçlar
apt install -y curl wget git nano ufw
```

### 2.3 Node.js Yükle

```bash
# NodeSource deposu ekle (Node.js 20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -

# Node.js yükle
apt install -y nodejs

# Versiyonları kontrol et
node --version    # v20.x.x olmalı
npm --version     # 10.x olmalı
```

### 2.4 PM2 Yükle (Sunucu Sürekliliği İçin)

PM2 = Uygulamayı arka planda 24/7 çalıştırır. Sunucu kapandığında PM2 otomatik olarak yeniden başlatır.

```bash
npm install -g pm2

# PM2 startup ayarla (sistem başlarken otomatik başlasın)
pm2 startup

# Çıktıyı kopyala ve yapıştır (verilen komut)
# Örn: sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup...
```

### 2.5 Firewall Ayarla

```bash
# Firewall aç
ufw enable

# Port 22 (SSH), 80 (HTTP), 443 (HTTPS), 5000 (Backend)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp

# Durumu kontrol et
ufw status
```

---

## 📥 Aşama 3: Backend Uygulamasını VPS'e Taşıma

### 3.1 Kodu GitHub'a Push Et

Replit'te başlamışsan, önce kodu GitHub'a gönder:

```bash
# Replit'te Terminal açıp:
git remote add origin https://github.com/SENIN_USERNAME/soulie.git
git branch -M main
git push -u origin main
```

### 3.2 VPS'de Repository'i Clone Et

```bash
# VPS'de (SSH ile bağlı)
cd /home
git clone https://github.com/SENIN_USERNAME/soulie.git soulie
cd soulie
```

### 3.3 Bağımlılıkları Yükle

```bash
npm install
```

Bu 2-3 dakika sürebilir. Terminal bitene kadar bekle.

### 3.4 Environment Variables Ayarla

```bash
# .env dosyası oluştur
nano .env
```

Aşağıdaki satırları yapıştır:

```env
# OpenAI API (gerekli)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-... # Replit'teki integration key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# Session (güvenlik için)
SESSION_SECRET=guclu_bir_sifre_yaz_burada_12345

# Ortam
NODE_ENV=production

# Port
PORT=5000

# Database (sonra dolduracağız)
DATABASE_URL=postgresql://soulie:PASSWORD@localhost:5432/soulie_db

# Gizli anahtarlar (sonra güncelle)
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

**NOT:** `AI_INTEGRATIONS_OPENAI_API_KEY` = Replit'teki integrations sekmesinden kopyala.

Dosyayı kaydet: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3.5 Backend Test Et

```bash
npm run server:dev
```

Eğer `express server serving on port 5000` yazarsa başarılı!

`Ctrl+C` ile durdur.

### 3.6 PM2 ile Sunucuyu Başlat

```bash
pm2 start "npm run server:dev" --name "soulie-backend"

# Durumu kontrol et
pm2 status

# Logları görüntüle
pm2 logs soulie-backend
```

Şimdi sunucun **otomatik olarak 24/7 çalışacak**.

---

## 💾 Aşama 4: Database Kurulumu

### Database Nedir?

Database = Veri deposu. Kullanıcı profilleri, sohbet geçmişi, karakterler vb. burada saklanır.

### 4.1 PostgreSQL Yükle

```bash
apt install -y postgresql postgresql-contrib

# Durumu kontrol et
systemctl status postgresql

# PostgreSQL başlat (eğer duruyorsa)
systemctl start postgresql
```

### 4.2 Database ve Kullanıcı Oluştur

```bash
# PostgreSQL'e gir
sudo -u postgres psql

# Komut satırında:
```

```sql
-- Kullanıcı oluştur
CREATE USER soulie WITH PASSWORD 'guclu_sifre_123';

-- Database oluştur
CREATE DATABASE soulie_db OWNER soulie;

-- İzinleri ver
GRANT ALL PRIVILEGES ON DATABASE soulie_db TO soulie;

-- Çık
\q
```

### 4.3 Bağlantı Kontrolü

```bash
# Bağlanabilir mi test et
psql -U soulie -d soulie_db -h localhost
```

Bağlanabildiyse `soulie_db=#` promptu çıkacak. `\q` ile çık.

### 4.4 .env Dosyasını Güncelle

```bash
nano .env
```

Şu satırı güncelle:
```env
DATABASE_URL=postgresql://soulie:guclu_sifre_123@localhost:5432/soulie_db
```

### 4.5 Backend'i Yeniden Başlat

```bash
pm2 restart soulie-backend
pm2 logs soulie-backend
```

Database bağlantısı başarılıysa hata görmeyeceksin.

---

## 🌐 Domain ve SSL Kurulumu (Opsiyonel Ama Önerilen)

### 5.1 Domain Satın Al

- https://namecheap.com veya https://godaddy.com git
- `.app`, `.dev`, `.com` uzantısından birini seç
- ~€10/yıl

### 5.2 DNS Ayarla

Domain satıcısında, DNS ayarlarında şunu ekle:

```
Type: A Record
Name: api (veya @)
Value: 45.123.45.67 (senin VPS IP'i)
TTL: 3600
```

5-30 dakika içinde geçerli olur.

### 5.3 Nginx & SSL Kurulumu

```bash
# Nginx yükle
apt install -y nginx certbot python3-certbot-nginx

# Nginx dosyası oluştur
nano /etc/nginx/sites-available/soulie
```

Aşağıdakileri yapıştır:

```nginx
server {
    server_name api.example.com;  # Kendi domainini yazWRITE

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Dosyaları aktifleştir
ln -s /etc/nginx/sites-available/soulie /etc/nginx/sites-enabled/soulie

# Nginx testa tabi tut
nginx -t

# Nginx başlat
systemctl restart nginx

# SSL sertifikası al (ücretsiz)
certbot --nginx -d api.example.com

# E-mail gir
# Terimiz kabul et
```

Artık `https://api.example.com` üzerinden backend erişilebilir!

---

## 📱 Aşama 5: App Store / Google Play Build Alma

### 5.1 Replit'te EAS Kurulumu

Replit'te Terminal açıp:

```bash
# EAS CLI yükle (bilgisayarında değil, Replit'te)
npm install -g eas-cli

# Expo hesabına giriş yap
eas login
# E-mail ve parola gir

# Projeyi EAS'a bağla
eas build:configure
```

### 5.2 Domainini Güncelle

**app.json** dosyasını aç ve güncelle:

```json
{
  "expo": {
    "plugins": [...],
    "extra": {
      "domain": "https://api.example.com"  // Kendi domainini yazçık
    }
  }
}
```

Veya Replit ortam değişkenlerinde:

```
EXPO_PUBLIC_DOMAIN=api.example.com
```

### 5.3 iOS Build Al

```bash
eas build --platform ios --profile preview
```

Bu 10-20 dakika sürer. Bittiğinde bir download linki verilecek.

Sonra üretime hazır build:

```bash
eas build --platform ios --profile production
```

### 5.4 Android Build Al

```bash
eas build --platform android --profile preview
```

Sonra:

```bash
eas build --platform android --profile production
```

Tüm buildler tamamlanana kadar bekle. (Saat sürebilir, sabredişi kuran için çay yapabilirsin 🍵)

---

## 🍎 Aşama 6: App Store Connect Kurulumu (iOS)

### 6.1 App Store Connect'e Giriş

- https://appstoreconnect.apple.com git
- Apple ID ile giriş yap
- **Agreements, Tax, and Banking** onaya tabi tut

### 6.2 App Oluştur

1. **+ New App** klikla
2. **iOS** seç
3. Doldur:
   - **App Name:** Soulie
   - **Primary Language:** Türkçe veya İngilizce
   - **Bundle ID:** com.luminaai (zaten seçili olmalı)
   - **SKU:** soulie-app-001 (herhangi bir kod)

### 6.3 App Bilgileri

1. **App Information** tab'ında:
   - **Privacy Policy:** https://example.com/privacy (veya boş bırakabilirsin)

2. **Pricing and Availability:**
   - **Price Tier:** Tier 0 (Ücretsiz)

3. **General** → **Rating** → Yaş puanlaması doldur

### 6.4 Version Bilgileri

1. **TestFlight** → **Version** sayfasında:
   - **Build:** EAS'tan aldığın iOS build'i seç
   - **Version Number:** 1.0.0
   - **Marketing Version:** 1.0.0
   - **What's New in This Version:** İlk sürüm

2. **App Preview and Screenshots:**
   - En az 5 screenshot ekle (Simulator'dan Al)
   - App Icon (1024x1024 PNG)

3. **Review Information:**
   - **Contact Information:** E-mail ve telefon
   - **Demo Account:** (İsteğe bağlı, satın alma testiyle ilgili)
   - **Notes:** Herhangi bir açıklama

---

## 🔐 Aşama 7: Google Play Console Kurulumu (Android)

### 7.1 Google Play Console'a Giriş

- https://play.google.com/console git
- Google hesabı ile giriş yap
- $25 developer fee (kredi kartıyla)

### 7.2 App Oluştur

1. **Create App** klikla
2. Doldur:
   - **App Name:** Soulie
   - **Default Language:** Türkçe
   - **App Category:** Productivity / Lifestyle
   - **App Type:** Free

### 7.3 App Setup

1. **App Details:**
   - **Short Description:** 80 karakter
   - **Full Description:** 4000 karakter
   - **Privacy Policy:** https://example.com/privacy
   - **Contact Email:** Senin e-mail

2. **Pricing:**
   - **Free**

3. **Screenshots:**
   - 2-8 adet screenshot (800x1280)

4. **Feature Graphic:**
   - 1024x500 PNG

5. **Icon:**
   - 512x512 PNG

### 7.4 Release Oluştur

1. **Release** → **Production** → **New Release**
2. EAS'tan aldığın APK'yı seç
3. **Version Code:** 1
4. **Release Notes:** İlk sürüm
5. **Save**

---

## 💳 Aşama 8: In-App Purchase (IAP) Kurulumu

In-App Purchase = Uygulama içinden satın alma (VIP paketleri, coinler vb.)

### 8.1 iOS'ta IAP Kurulumu

**App Store Connect'te:**

1. **In-App Purchases** tab'ına git
2. **+** klikla
3. **Subscription** seç (VIP paketleri için)
4. **Product ID:** `com.luminaai.vip.weekly`
5. Doldur:
   - **Reference Name:** Weekly VIP
   - **Subscription Duration:** 1 Week
   - **Price Tier:** Tier 3 ($9.99 gibi)
   - **Localization:** Türkçe açıklamalar ekle
6. **Save**

Diğerleri için:
- `com.luminaai.vip.monthly` (1 Ay)
- `com.luminaai.vip.yearly` (1 Yıl)

### 8.2 Android'de IAP Kurulumu

**Google Play Console'da:**

1. **Products** → **In-app products** → **Create product**
2. **Product ID:** `com.luminaai.vip.weekly`
3. Doldur:
   - **Name:** Weekly VIP
   - **Description:** Tüm premium özelliklerin kilidini aç
   - **Price:** $9.99
   - **Status:** Aktif yap
4. **Save**

### 8.3 Uygulamada RevenueCat Kurulumu (Opsiyonel)

RevenueCat = IAP yönetimi basitleştiren servis.

```bash
npm install react-native-purchases
```

Kodda (Chat sayfasında VIP aktivasyon yerine):

```javascript
// VIP pakete tıklandığında
try {
  const purchaseResult = await Purchases.purchasePackage(vipPackage);
  // Başarı!
  Alert.alert("VIP Aktif!", "Tüm premium özellikler açıldı");
} catch (e) {
  if (e.code === "PurchaseCancelledError") {
    // Kullanıcı iptal etti
  } else {
    Alert.alert("Satın Alma Hatası", e.message);
  }
}
```

**NOT:** Şu an RevenueCat'siz, uygulama "Çok Yakında" gösteriyor. IAP tamamlandığında kodu güncelleyebilirsin.

---

## 🚀 Aşama 9: Uygulamayı App Store / Play Store'a Gönder

### 9.1 iOS'ta Gönderme

**App Store Connect'te:**

1. **Version** sayfasında **Submit for Review** klikla
2. **Content Rights** soruları yanıtla
3. **Export Compliance** (cryptography) → "No" seç
4. **Advertising** → Uygulan
5. **Confirm**

Apple 1-3 gün içinde onay veya red verir.

### 9.2 Android'de Gönderme

**Google Play Console'da:**

1. **Release** → **Production**
2. **Review status** kontrol et
3. **Harita veya ülke hedeflemesi** yapabilirsin
4. **Türkiye** veya tüm dünya seç
5. **Start rollout** klikla

Google genellikle 2-4 saatte onay verir.

---

## 🆘 Sorun Giderme

### Backend Başlamıyor

```bash
# Logları kontrol et
pm2 logs soulie-backend

# Eğer error varsa:
npm run server:dev  # Directly çalıştırarak gerçek hatayı görmek
```

### Database Bağlanmıyor

```bash
# PostgreSQL çalışıyor mu?
systemctl status postgresql

# Connection testa tabi tut
psql -U soulie -d soulie_db -h localhost
```

### Domain Çalışmıyor

```bash
# DNS yayılmış mı kontrolü
nslookup api.example.com

# Nginx error?
nginx -t
systemctl status nginx
```

### Uygulama Backend'e Bağlanamıyor

**app.json'da kontrol et:**
```json
"extra": {
  "domain": "api.example.com"  // https:// ekli mi?
}
```

### IAP Çalışmıyor

- App Store Connect'te abonelik status: `Active` mi?
- Signing Certificate ve Provisioning Profile güncel mi?
- Sandbox tester hesabı eklemiş misin?

```bash
# Sandbox tester ekle
App Store Connect → Users and Access → Sandbox
```

---

## ✅ Kontrol Listesi

Yayına Alma Öncesi Kontrol Et:

- [ ] VPS satın alındı ve root access'e sahipsin
- [ ] Node.js, PM2, PostgreSQL yüklü
- [ ] Backend çalışıyor (`pm2 status`)
- [ ] Database bağlı (`psql test`)
- [ ] Domain satın alındı ve DNS ayarlandı
- [ ] Nginx ve SSL çalışıyor (`https://api.example.com`)
- [ ] Uygulamada domain güncellendi
- [ ] iOS build tamamlandı
- [ ] Android build tamamlandı
- [ ] App Store Connect hesabı hazır
- [ ] Google Play Console hesabı hazır
- [ ] IAP ürünleri tanımlandı
- [ ] Screenshots ve description hazır
- [ ] Privacy Policy URL'i hazır
- [ ] Build'ler App Store / Play Store'a yüklendi

---

## 📞 Hızlı Referans

| Sorun | Çözüm |
|---|---|
| `Cannot connect to backend` | VPS IP/domain `app.json`'de doğru mu? |
| `Database error` | `.env` dosyasında `DATABASE_URL` doğru mu? |
| `Port 5000 already in use` | `pm2 delete soulie-backend` ve yeniden başlat |
| `SSL sertifikası hatası | `certbot renew` çalıştır |
| `App Store API limitesi` | Biraz bekle, tekrar dene |

---

## 🎉 Bitti!

Bu adımları tamamladığında:
✅ Backend VPS'te çalışıyor
✅ Veritabanı kurulu ve güvenli
✅ Uygulamalar App Store ve Play Store'da canlı
✅ IAP (satın almalar) aktif
✅ Kullanıcılar indirebiliyor ve kullanıyor

İyi şanalar! 🚀
