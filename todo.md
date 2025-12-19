# Cep Telefonu Yenileme Merkezi - Geliştirme Planı

## Tasarım Yönergeleri

### Tasarım Referansları
- **Stil**: Modern Dashboard + Profesyonel + Temiz Arayüz
- **Tema**: Açık mod (Light Mode) - İş ortamı için uygun

### Renk Paleti
- Primary: #2563EB (Mavi - ana butonlar ve vurgular)
- Secondary: #64748B (Gri - ikincil öğeler)
- Success: #10B981 (Yeşil - başarılı işlemler)
- Warning: #F59E0B (Turuncu - bekleyen durumlar)
- Danger: #EF4444 (Kırmızı - arızalı durumlar)
- Background: #F8FAFC (Açık gri - arka plan)
- Card: #FFFFFF (Beyaz - kartlar)
- Text: #1E293B (Koyu gri - ana metin)

### Tipografi
- Heading1: Inter font-weight 700 (32px)
- Heading2: Inter font-weight 600 (24px)
- Heading3: Inter font-weight 600 (18px)
- Body: Inter font-weight 400 (14px)
- Label: Inter font-weight 500 (14px)

### Ana Bileşen Stilleri
- **Butonlar**: Mavi arka plan, beyaz metin, 6px yuvarlatma, hover: koyulaşma
- **Kartlar**: Beyaz arka plan, gölge, 8px yuvarlatma
- **Formlar**: Gri kenarlık, odakta mavi vurgu
- **Tablolar**: Zebra çizgili, hover efekti

### Oluşturulacak Görseller
1. **logo-phone-repair.png** - Telefon tamir logosu, modern ve profesyonel (Stil: minimalist, mavi tonlar)
2. **icon-device-check.png** - Cihaz kontrol ikonu (Stil: line icon, mavi)
3. **icon-repair-service.png** - Teknik servis ikonu (Stil: line icon, turuncu)

---

## Veritabanı Yapısı

### Tablolar

#### app_a6234_devices (Cihazlar)
- id (UUID, Primary Key)
- imei (TEXT, UNIQUE, NOT NULL)
- brand (TEXT, NOT NULL)
- model (TEXT, NOT NULL)
- entry_date (TIMESTAMP, NOT NULL)
- status (TEXT, NOT NULL) - 'pending_inspection', 'inspected', 'sent_to_service', 'repaired', 'completed'
- created_by (UUID, Foreign Key -> auth.users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

#### app_a6234_defects (Arızalar)
- id (UUID, Primary Key)
- device_id (UUID, Foreign Key -> app_a6234_devices)
- defect_type (TEXT, NOT NULL) - 'screen', 'battery', 'camera', 'software', 'speaker', 'microphone', 'charging_port', 'other'
- description (TEXT)
- severity (TEXT, NOT NULL) - 'low', 'medium', 'high'
- detected_by (UUID, Foreign Key -> auth.users)
- detected_at (TIMESTAMP)

#### app_a6234_service_requests (Teknik Servis İstekleri)
- id (UUID, Primary Key)
- device_id (UUID, Foreign Key -> app_a6234_devices)
- request_date (TIMESTAMP, NOT NULL)
- sent_date (TIMESTAMP)
- completed_date (TIMESTAMP)
- status (TEXT, NOT NULL) - 'pending', 'sent', 'in_progress', 'completed'
- notes (TEXT)
- created_by (UUID, Foreign Key -> auth.users)

#### app_a6234_user_profiles (Kullanıcı Profilleri)
- id (UUID, Primary Key, Foreign Key -> auth.users)
- full_name (TEXT, NOT NULL)
- role (TEXT, NOT NULL) - 'operator', 'technician', 'admin'
- created_at (TIMESTAMP)

---

## Geliştirme Görevleri

### 1. Proje Kurulumu ve Veritabanı
- Supabase bağımlılıklarını yükle
- Veritabanı tablolarını oluştur (RLS politikaları ile)
- Supabase client yapılandırması

### 2. Kimlik Doğrulama Sistemi
- Login sayfası (email/şifre)
- Signup sayfası (kullanıcı kaydı + rol seçimi)
- Auth context ve protected routes
- Logout fonksiyonu

### 3. Ana Dashboard Layout
- Sidebar navigasyon menüsü
- Header (kullanıcı bilgisi, çıkış butonu)
- Ana içerik alanı
- Responsive tasarım

### 4. Cihaz Kayıt Modülü
- Yeni cihaz ekleme formu (IMEI, marka, model)
- Form validasyonu
- Veritabanına kaydetme

### 5. Arıza Tespit Modülü
- Cihaz seçimi
- Arıza tipi seçimi (checkbox listesi)
- Arıza açıklaması ve öncelik seviyesi
- Çoklu arıza kaydı

### 6. Cihaz Listeleme ve Detay
- Tüm cihazları listeleyen tablo
- Durum filtreleme (beklemede, kontrol edildi, serviste, vb.)
- Arama fonksiyonu (IMEI, marka, model)
- Cihaz detay sayfası (arıza geçmişi)

### 7. Teknik Servis Gönderim
- Arızalı cihazları servise gönderme formu
- Durum güncelleme (gönderildi, tamir edildi)
- Servis notları ekleme

### 8. Raporlama Paneli
- Genel istatistikler (toplam cihaz, arızalı, tamir edilmiş)
- Arıza türlerine göre grafik (Chart.js veya Recharts)
- Günlük/aylık rapor filtreleme
- Teknik servis performans metrikleri

### 9. Kullanıcı Yönetimi (Admin)
- Kullanıcı listesi
- Rol değiştirme
- Kullanıcı aktivite logları

### 10. Test ve Optimizasyon
- Lint kontrolü
- Build testi
- Responsive test
- Çok kullanıcılı test senaryoları