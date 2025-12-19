import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInspectionQueue } from '@/contexts/InspectionQueueContext';
import { db, Device } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Printer, CheckCircle, XCircle, ListOrdered, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface InspectionData {
  screenBroken: 'yes' | 'no' | '';
  cameraDefect: 'yes' | 'no' | '';
  soundDefect: 'yes' | 'no' | '';
  backCoverBroken: 'yes' | 'no' | '';
  bodyDamage: 'yes' | 'no' | '';
  batteryLevel: string;
  imei: string;
  brand: string;
  model: string;
}

export default function InitialInspection() {
  const { user } = useAuth();
  const { queue, removeFromQueue } = useInspectionQueue();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InspectionData>({
    screenBroken: '',
    cameraDefect: '',
    soundDefect: '',
    backCoverBroken: '',
    bodyDamage: '',
    batteryLevel: '',
    imei: '',
    brand: '',
    model: ''
  });

  // İlk cihazı otomatik seç
  useEffect(() => {
    if (queue.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(queue[0].id);
    }
  }, [queue, selectedDeviceId]);

  // Seçili cihaz değiştiğinde formu güncelle
  useEffect(() => {
    if (selectedDeviceId) {
      const selectedDevice = queue.find(item => item.id === selectedDeviceId);
      if (selectedDevice) {
        setFormData(prev => ({
          ...prev,
          brand: selectedDevice.brand,
          model: selectedDevice.model,
          imei: selectedDevice.imei
        }));
      }
    }
  }, [selectedDeviceId, queue]);

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    // Kontrol verilerini sıfırla ama cihaz bilgilerini koru
    const selectedDevice = queue.find(item => item.id === deviceId);
    if (selectedDevice) {
      setFormData({
        screenBroken: '',
        cameraDefect: '',
        soundDefect: '',
        backCoverBroken: '',
        bodyDamage: '',
        batteryLevel: '',
        brand: selectedDevice.brand,
        model: selectedDevice.model,
        imei: selectedDevice.imei
      });
    }
  };

  const handlePrint = async () => {
    // Validasyon
    if (!formData.imei || !formData.brand || !formData.model) {
      toast.error('Lütfen IMEI, Marka ve Model bilgilerini girin!');
      return;
    }

    if (!formData.screenBroken || !formData.cameraDefect || !formData.soundDefect || 
        !formData.backCoverBroken || !formData.bodyDamage) {
      toast.error('Lütfen tüm kontrol sorularını cevaplayın!');
      return;
    }

    if (!formData.batteryLevel || parseInt(formData.batteryLevel) < 0 || parseInt(formData.batteryLevel) > 100) {
      toast.error('Lütfen geçerli bir pil seviyesi girin (0-100)!');
      return;
    }

    try {
      // QR kod içeriği
      const qrContent = JSON.stringify({
        imei: formData.imei,
        brand: formData.brand,
        model: formData.model,
        inspection: {
          screenBroken: formData.screenBroken === 'yes',
          cameraDefect: formData.cameraDefect === 'yes',
          soundDefect: formData.soundDefect === 'yes',
          backCoverBroken: formData.backCoverBroken === 'yes',
          bodyDamage: formData.bodyDamage === 'yes',
          batteryLevel: parseInt(formData.batteryLevel)
        },
        date: new Date().toISOString()
      });

      // QR kod oluştur
      const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 1
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Yazdırma penceresi açılamadı. Lütfen popup engelleyiciyi kontrol edin.');
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>İlk Kontrol Raporu - ${formData.brand} ${formData.model}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: 10cm 15cm;
              margin: 0;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              width: 10cm;
              min-height: 15cm;
              padding: 0.5cm;
              display: flex;
              flex-direction: column;
            }
            
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 0.3cm;
              margin-bottom: 0.3cm;
            }
            
            .header h1 {
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 0.1cm;
            }
            
            .header p {
              font-size: 10pt;
              color: #333;
              font-weight: bold;
            }
            
            .device-info {
              margin-bottom: 0.3cm;
              padding: 0.2cm;
              background: #f5f5f5;
              border-radius: 0.2cm;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 0.1cm;
              font-size: 9pt;
            }
            
            .info-label {
              font-weight: bold;
            }
            
            .imei-large {
              font-size: 11pt;
              font-weight: bold;
              letter-spacing: 0.05cm;
              text-align: center;
              margin: 0.2cm 0;
            }
            
            .inspection-section {
              margin-bottom: 0.3cm;
            }
            
            .section-title {
              font-size: 10pt;
              font-weight: bold;
              margin-bottom: 0.2cm;
              border-bottom: 1px solid #ccc;
              padding-bottom: 0.1cm;
            }
            
            .check-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.15cm 0;
              font-size: 9pt;
              border-bottom: 1px dashed #ddd;
            }
            
            .check-label {
              flex: 1;
            }
            
            .check-value {
              font-weight: bold;
              padding: 0.1cm 0.3cm;
              border-radius: 0.2cm;
            }
            
            .check-yes {
              background: #fee;
              color: #c00;
            }
            
            .check-no {
              background: #efe;
              color: #060;
            }
            
            .battery-section {
              margin: 0.3cm 0;
              padding: 0.2cm;
              background: #f0f8ff;
              border-radius: 0.2cm;
              text-align: center;
            }
            
            .battery-label {
              font-size: 9pt;
              font-weight: bold;
              margin-bottom: 0.1cm;
            }
            
            .battery-value {
              font-size: 18pt;
              font-weight: bold;
              color: #0066cc;
            }
            
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 0.3cm;
              padding-top: 0.3cm;
              border-top: 2px solid #000;
            }
            
            .qr-code {
              width: 3.5cm;
              height: 3.5cm;
              border: 2px solid #000;
            }
            
            .qr-label {
              font-size: 8pt;
              text-align: center;
              margin-top: 0.1cm;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              font-size: 7pt;
              margin-top: auto;
              padding-top: 0.2cm;
              border-top: 1px solid #ccc;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TAMMOBIL YENILEME MERKEZİ</h1>
            <p>İlk Kontrol Raporu</p>
          </div>
          
          <div class="device-info">
            <div class="info-row">
              <span class="info-label">Marka:</span>
              <span>${formData.brand}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Model:</span>
              <span>${formData.model}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tarih:</span>
              <span>${new Date().toLocaleDateString('tr-TR')}</span>
            </div>
          </div>
          
          <div class="imei-large">IMEI: ${formData.imei}</div>
          
          <div class="inspection-section">
            <div class="section-title">Fiziksel Kontrol</div>
            
            <div class="check-item">
              <span class="check-label">Ekran Kırık mı?</span>
              <span class="check-value ${formData.screenBroken === 'yes' ? 'check-yes' : 'check-no'}">
                ${formData.screenBroken === 'yes' ? 'EVET' : 'HAYIR'}
              </span>
            </div>
            
            <div class="check-item">
              <span class="check-label">Kamera Arızası var mı?</span>
              <span class="check-value ${formData.cameraDefect === 'yes' ? 'check-yes' : 'check-no'}">
                ${formData.cameraDefect === 'yes' ? 'EVET' : 'HAYIR'}
              </span>
            </div>
            
            <div class="check-item">
              <span class="check-label">Ses Arızası var mı?</span>
              <span class="check-value ${formData.soundDefect === 'yes' ? 'check-yes' : 'check-no'}">
                ${formData.soundDefect === 'yes' ? 'EVET' : 'HAYIR'}
              </span>
            </div>
            
            <div class="check-item">
              <span class="check-label">Arka Kapak Kırık mı?</span>
              <span class="check-value ${formData.backCoverBroken === 'yes' ? 'check-yes' : 'check-no'}">
                ${formData.backCoverBroken === 'yes' ? 'EVET' : 'HAYIR'}
              </span>
            </div>
            
            <div class="check-item">
              <span class="check-label">Kasada Darbe var mı?</span>
              <span class="check-value ${formData.bodyDamage === 'yes' ? 'check-yes' : 'check-no'}">
                ${formData.bodyDamage === 'yes' ? 'EVET' : 'HAYIR'}
              </span>
            </div>
          </div>
          
          <div class="battery-section">
            <div class="battery-label">Pil Seviyesi</div>
            <div class="battery-value">%${formData.batteryLevel}</div>
          </div>
          
          <div class="qr-section">
            <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
            <div class="qr-label">İlk Kontrol QR Kodu<br/>Tüm bilgileri içerir</div>
          </div>
          
          <div class="footer">
            <strong>Tammobil Yenileme Merkezi</strong> | ${new Date().getFullYear()}
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        }, 500);
      };

      // Cihazı veritabanına ekle (Arıza Tespiti için)
      try {
        const newDevice: Omit<Device, 'id' | 'created_at'> = {
          imei: formData.imei,
          brand: formData.brand,
          model: formData.model,
          entry_date: new Date().toISOString(),
          status: 'pending_inspection',
          created_by: user?.id || ''
        };

        await db.addDevice(newDevice);
        toast.success('İlk kontrol raporu yazdırılıyor! Cihaz arıza tespitine eklendi.');
      } catch (error) {
        console.error('Cihaz eklenirken hata:', error);
        toast.warning('Rapor yazdırıldı ancak cihaz veritabanına eklenemedi.');
      }

      // Tamamlanan cihazı kuyruktan çıkar
      if (selectedDeviceId) {
        removeFromQueue(selectedDeviceId);
        
        // Kuyrukta başka cihaz varsa ilkini seç
        if (queue.length > 1) {
          const remainingDevices = queue.filter(item => item.id !== selectedDeviceId);
          if (remainingDevices.length > 0) {
            setTimeout(() => {
              setSelectedDeviceId(remainingDevices[0].id);
              toast.success(`Sıradaki cihaz yüklendi: ${remainingDevices[0].brand} ${remainingDevices[0].model}`);
            }, 1000);
          }
        } else {
          // Kuyruk boş, formu temizle
          setSelectedDeviceId(null);
          setFormData({
            screenBroken: '',
            cameraDefect: '',
            soundDefect: '',
            backCoverBroken: '',
            bodyDamage: '',
            batteryLevel: '',
            imei: '',
            brand: '',
            model: ''
          });
        }
      }
    } catch (error) {
      console.error('QR kod oluşturma hatası:', error);
      toast.error('QR kod oluşturulurken bir hata oluştu!');
    }
  };

  const isFormValid = () => {
    return formData.imei && formData.brand && formData.model &&
           formData.screenBroken && formData.cameraDefect && formData.soundDefect &&
           formData.backCoverBroken && formData.bodyDamage && formData.batteryLevel &&
           parseInt(formData.batteryLevel) >= 0 && parseInt(formData.batteryLevel) <= 100;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">İlk Kontrol</h1>
            <p className="text-gray-600 mt-1">Cihazın ilk fiziksel kontrolünü yapın ve rapor yazdırın</p>
          </div>
          {queue.length > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <ListOrdered className="w-5 h-5 mr-2" />
              Kuyrukta: {queue.length} cihaz
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sol Panel - Cihaz Listesi */}
          {queue.length > 0 && (
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Bekleyen Cihazlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {queue.map((device, index) => (
                      <button
                        key={device.id}
                        onClick={() => handleDeviceSelect(device.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedDeviceId === device.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={selectedDeviceId === device.id ? 'default' : 'secondary'} className="text-xs">
                            #{index + 1}
                          </Badge>
                          {selectedDeviceId === device.id && (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-sm text-gray-900">{device.brand}</p>
                          <p className="text-sm text-gray-600">{device.model}</p>
                          <p className="text-xs font-mono text-gray-500 break-all">{device.imei}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Sağ Panel - Form */}
          <div className={queue.length > 0 ? 'lg:col-span-3 space-y-6' : 'lg:col-span-4 space-y-6'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cihaz Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marka</Label>
                    <Input
                      id="brand"
                      placeholder="Apple, Samsung, Xiaomi..."
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      disabled={queue.length > 0}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      placeholder="iPhone 13, Galaxy S21..."
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      disabled={queue.length > 0}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imei">IMEI</Label>
                    <Input
                      id="imei"
                      placeholder="123456789012345"
                      value={formData.imei}
                      onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                      disabled={queue.length > 0}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fiziksel Kontrol</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Ekran Kırık mı?</Label>
                    <RadioGroup
                      value={formData.screenBroken}
                      onValueChange={(value: 'yes' | 'no') => setFormData({ ...formData, screenBroken: value })}
                    >
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="screen-yes" />
                          <Label htmlFor="screen-yes" className="flex items-center gap-2 cursor-pointer">
                            <XCircle className="w-4 h-4 text-red-500" />
                            Evet
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="screen-no" />
                          <Label htmlFor="screen-no" className="flex items-center gap-2 cursor-pointer">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Hayır
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Kamera Arızası var mı?</Label>
                    <RadioGroup
                      value={formData.cameraDefect}
                      onValueChange={(value: 'yes' | 'no') => setFormData({ ...formData, cameraDefect: value })}
                    >
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="camera-yes" />
                          <Label htmlFor="camera-yes" className="flex items-center gap-2 cursor-pointer">
                            <XCircle className="w-4 h-4 text-red-500" />
                            Evet
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="camera-no" />
                          <Label htmlFor="camera-no" className="flex items-center gap-2 cursor-pointer">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Hayır
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Ses Arızası var mı?</Label>
                    <RadioGroup
                      value={formData.soundDefect}
                      onValueChange={(value: 'yes' | 'no') => setFormData({ ...formData, soundDefect: value })}
                    >
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="sound-yes" />
                          <Label htmlFor="sound-yes" className="flex items-center gap-2 cursor-pointer">
                            <XCircle className="w-4 h-4 text-red-500" />
                            Evet
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="sound-no" />
                          <Label htmlFor="sound-no" className="flex items-center gap-2 cursor-pointer">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Hayır
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Arka Kapak Kırık mı?</Label>
                    <RadioGroup
                      value={formData.backCoverBroken}
                      onValueChange={(value: 'yes' | 'no') => setFormData({ ...formData, backCoverBroken: value })}
                    >
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="back-yes" />
                          <Label htmlFor="back-yes" className="flex items-center gap-2 cursor-pointer">
                            <XCircle className="w-4 h-4 text-red-500" />
                            Evet
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="back-no" />
                          <Label htmlFor="back-no" className="flex items-center gap-2 cursor-pointer">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Hayır
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Kasada Darbe var mı?</Label>
                    <RadioGroup
                      value={formData.bodyDamage}
                      onValueChange={(value: 'yes' | 'no') => setFormData({ ...formData, bodyDamage: value })}
                    >
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="body-yes" />
                          <Label htmlFor="body-yes" className="flex items-center gap-2 cursor-pointer">
                            <XCircle className="w-4 h-4 text-red-500" />
                            Evet
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="body-no" />
                          <Label htmlFor="body-no" className="flex items-center gap-2 cursor-pointer">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Hayır
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="battery">Pil Seviyesi (%)</Label>
                    <Input
                      id="battery"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100 arası bir değer girin"
                      value={formData.batteryLevel}
                      onChange={(e) => setFormData({ ...formData, batteryLevel: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handlePrint}
                  disabled={!isFormValid()}
                  className="w-full h-14 text-lg"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  QR Kod ile Rapor Yazdır
                  {queue.length > 0 && <span className="ml-2 text-sm">({queue.length} kuyrukta)</span>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}