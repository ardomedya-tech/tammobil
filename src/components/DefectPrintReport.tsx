import { Device, Defect, db } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface DefectPrintReportProps {
  device: Device;
  defects: Defect[];
  onServiceRequestCreated?: () => void;
}

const defectTypeLabels: Record<string, string> = {
  screen: 'Ekran',
  battery: 'Batarya',
  camera: 'Kamera',
  software: 'Yazılım',
  speaker: 'Hoparlör',
  microphone: 'Mikrofon',
  charging_port: 'Şarj Portu',
  refurbishment: 'Yenileme',
  other: 'Diğer'
};

const severityLabels: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek'
};

export const DefectPrintReport = ({ device, defects, onServiceRequestCreated }: DefectPrintReportProps) => {
  const { user } = useAuth();

  const handlePrint = async () => {
    try {
      // QR kod içeriği: IMEI + Marka + Model + Arızalar
      const qrContent = JSON.stringify({
        imei: device.imei,
        brand: device.brand,
        model: device.model,
        defects: defects.map(d => defectTypeLabels[d.defect_type])
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
          <title>Arıza Tespit Barkodu - ${device.brand} ${device.model}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: 10cm 10cm;
              margin: 0;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              width: 10cm;
              height: 10cm;
              padding: 0.5cm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 0.2cm;
              margin-bottom: 0.2cm;
            }
            
            .header h1 {
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 0.1cm;
            }
            
            .header p {
              font-size: 8pt;
              color: #333;
            }
            
            .content {
              flex: 1;
              display: flex;
              gap: 0.3cm;
            }
            
            .left-section {
              flex: 1;
              font-size: 8pt;
            }
            
            .info-row {
              margin-bottom: 0.15cm;
              display: flex;
              gap: 0.1cm;
            }
            
            .info-label {
              font-weight: bold;
              min-width: 1.5cm;
            }
            
            .info-value {
              word-break: break-all;
            }
            
            .defects-section {
              margin-top: 0.2cm;
              border-top: 1px solid #ccc;
              padding-top: 0.2cm;
            }
            
            .defects-title {
              font-weight: bold;
              font-size: 9pt;
              margin-bottom: 0.1cm;
            }
            
            .defect-item {
              font-size: 7pt;
              margin-bottom: 0.1cm;
              padding-left: 0.2cm;
            }
            
            .severity-high {
              color: #dc2626;
              font-weight: bold;
            }
            
            .severity-medium {
              color: #ea580c;
              font-weight: bold;
            }
            
            .severity-low {
              color: #ca8a04;
            }
            
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 3.5cm;
            }
            
            .qr-code {
              width: 3cm;
              height: 3cm;
              border: 2px solid #000;
            }
            
            .qr-label {
              font-size: 7pt;
              text-align: center;
              margin-top: 0.1cm;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              font-size: 7pt;
              border-top: 1px solid #ccc;
              padding-top: 0.1cm;
            }
            
            .imei-large {
              font-size: 11pt;
              font-weight: bold;
              letter-spacing: 0.05cm;
              margin-top: 0.1cm;
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
            <p>Arıza Tespit Barkodu</p>
          </div>
          
          <div class="content">
            <div class="left-section">
              <div class="info-row">
                <span class="info-label">Marka:</span>
                <span class="info-value">${device.brand}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Model:</span>
                <span class="info-value">${device.model}</span>
              </div>
              <div class="info-row">
                <span class="info-label">IMEI:</span>
                <span class="info-value imei-large">${device.imei}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Giriş:</span>
                <span class="info-value">${new Date(device.entry_date).toLocaleDateString('tr-TR')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Rapor:</span>
                <span class="info-value">${new Date().toLocaleDateString('tr-TR')}</span>
              </div>
              
              <div class="defects-section">
                <div class="defects-title">Tespit Edilen Arızalar (${defects.length})</div>
                ${defects.slice(0, 6).map((defect, index) => `
                  <div class="defect-item">
                    <span class="severity-${defect.severity}">●</span>
                    ${index + 1}. ${defectTypeLabels[defect.defect_type]}
                    ${defect.description ? ` - ${defect.description.substring(0, 30)}${defect.description.length > 30 ? '...' : ''}` : ''}
                  </div>
                `).join('')}
                ${defects.length > 6 ? `<div class="defect-item">+ ${defects.length - 6} arıza daha...</div>` : ''}
              </div>
            </div>
            
            <div class="qr-section">
              <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
              <div class="qr-label">IMEI + Arızalar<br/>QR kodu okutun</div>
            </div>
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

      // Otomatik olarak teknik servis talebi oluştur
      try {
        // Önce bu cihaz için zaten bir servis talebi var mı kontrol et
        const existingRequest = await db.getServiceRequestByDevice(device.id);
        
        if (!existingRequest) {
          // Yeni servis talebi oluştur
          const newServiceRequest = {
            device_id: device.id,
            status: 'sent' as const,
            service_cost: 0,
            sent_by: user?.id || '',
            notes: `Arıza tespiti tamamlandı. Tespit edilen arızalar: ${defects.map(d => defectTypeLabels[d.defect_type]).join(', ')}`
          };

          await db.addServiceRequest(newServiceRequest);
          
          // Cihaz durumunu güncelle
          await db.updateDevice(device.id, { status: 'in_service' });
          
          toast.success('Barkod yazdırıldı ve teknik servis talebi oluşturuldu!');
          
          // Callback çağır (eğer varsa)
          if (onServiceRequestCreated) {
            onServiceRequestCreated();
          }
        } else {
          toast.success('Barkod yazdırma hazırlandı!');
        }
      } catch (error) {
        console.error('Servis talebi oluşturma hatası:', error);
        toast.warning('Barkod yazdırıldı ancak servis talebi oluşturulamadı!');
      }
    } catch (error) {
      console.error('QR kod oluşturma hatası:', error);
      toast.error('QR kod oluşturulurken bir hata oluştu!');
    }
  };

  return (
    <Button onClick={handlePrint} variant="outline" className="gap-2">
      <Printer className="w-4 h-4" />
      Barkod Yazdır
    </Button>
  );
};