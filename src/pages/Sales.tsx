import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db, Device } from '@/lib/supabase';
import { toast } from 'sonner';
import { ShoppingCart, Search, CheckCircle, Package, Printer } from 'lucide-react';
import QRCode from 'qrcode';

export default function Sales() {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [selectedDeviceForBarcode, setSelectedDeviceForBarcode] = useState<Device | null>(null);
  const [barcodeData, setBarcodeData] = useState<{
    defects: string[];
    costs: { type: string; cost: number }[];
    totalCost: number;
  } | null>(null);

  const loadDevices = async () => {
    const devicesData = await db.getDevices();
    setAllDevices(devicesData);
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const repairedDevices = allDevices.filter(d => d.status === 'repaired');
  const completedDevices = allDevices.filter(d => d.status === 'completed');

  const handleMarkAsForSale = async (deviceId: string) => {
    await db.updateDevice(deviceId, { status: 'completed' });
    toast.success('Cihaz satışa hazır olarak işaretlendi!');
    await loadDevices();
  };

  const handlePrintBarcode = async (device: Device) => {
    // Cihazın arızalarını ve servis maliyetlerini al
    const defects = await db.getDefectsByDevice(device.id);
    const serviceRequest = await db.getServiceRequestByDevice(device.id);

    const defectTypes = defects.map(d => {
      const typeLabels: Record<string, string> = {
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
      return typeLabels[d.defect_type] || d.defect_type;
    });

    const costs = defects.map(d => ({
      type: d.defect_type,
      cost: 0 // Arıza başına maliyet bilgisi yoksa 0
    }));

    const totalCost = serviceRequest?.service_cost || 0;

    setBarcodeData({
      defects: defectTypes,
      costs,
      totalCost
    });

    setSelectedDeviceForBarcode(device);
    setShowBarcodeDialog(true);
  };

  const generateAndPrintBarcode = async () => {
    if (!selectedDeviceForBarcode || !barcodeData) return;

    try {
      // QR kod içeriği: IMEI + yapılan işlemler
      const qrContent = JSON.stringify({
        imei: selectedDeviceForBarcode.imei,
        brand: selectedDeviceForBarcode.brand,
        model: selectedDeviceForBarcode.model,
        defects: barcodeData.defects,
        totalCost: barcodeData.totalCost
      });

      // QR kod oluştur
      const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 1
      });

      // Yazdırma penceresi oluştur
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Yazdırma penceresi açılamadı. Lütfen popup engelleyiciyi kontrol edin.');
        return;
      }

      // 10x10 cm barkod etiketi HTML'i (1 cm = 37.8 piksel)
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Barkod Etiketi - ${selectedDeviceForBarcode.imei}</title>
          <style>
            @page {
              size: 10cm 10cm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              width: 10cm;
              height: 10cm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
              padding: 0.5cm;
            }
            .barcode-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              border: 2px solid #000;
              padding: 0.3cm;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              width: 100%;
            }
            .brand-model {
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 0.2cm;
            }
            .imei {
              font-size: 10pt;
              font-family: 'Courier New', monospace;
              margin-bottom: 0.3cm;
            }
            .qr-code {
              width: 4cm;
              height: 4cm;
              margin: 0.2cm 0;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
            }
            .details {
              width: 100%;
              font-size: 8pt;
              text-align: left;
            }
            .details-row {
              margin-bottom: 0.1cm;
              display: flex;
              justify-content: space-between;
            }
            .total-cost {
              font-weight: bold;
              font-size: 10pt;
              margin-top: 0.2cm;
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 0.1cm;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="header">
              <div class="brand-model">${selectedDeviceForBarcode.brand} ${selectedDeviceForBarcode.model}</div>
              <div class="imei">IMEI: ${selectedDeviceForBarcode.imei}</div>
            </div>
            
            <div class="qr-code">
              <img src="${qrCodeDataUrl}" alt="QR Code" />
            </div>
            
            <div class="details">
              <div style="font-weight: bold; margin-bottom: 0.2cm;">Yapılan İşlemler:</div>
              ${barcodeData.defects.map(defect => `
                <div class="details-row">
                  <span>• ${defect}</span>
                </div>
              `).join('')}
              
              <div class="total-cost">
                Toplam Maliyet: ${barcodeData.totalCost.toFixed(2)} ₺
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Yazdırma diyaloğunu aç
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };

      toast.success('Barkod yazdırma hazırlandı!');
      setShowBarcodeDialog(false);
    } catch (error) {
      console.error('Barkod oluşturma hatası:', error);
      toast.error('Barkod oluşturulurken bir hata oluştu!');
    }
  };

  const filteredDevices = repairedDevices.filter(device => 
    device.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Satışa Hazır Cihazlar</h1>
          <p className="text-gray-600 mt-1">Tamir edilmiş ve satışa hazır cihazları yönetin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tamir Edildi</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{repairedDevices.length}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Satışa Hazır</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{completedDevices.length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Stok</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{repairedDevices.length + completedDevices.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tamir Edilmiş Cihazlar */}
        {repairedDevices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Tamir Edilmiş Cihazlar (Satışa Açılmayı Bekliyor)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="IMEI, marka veya model ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredDevices.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Tamir edilmiş cihaz bulunamadı</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Marka</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Giriş Tarihi</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                        <TableCell>{device.brand}</TableCell>
                        <TableCell>{device.model}</TableCell>
                        <TableCell>{new Date(device.entry_date).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsForSale(device.id)}
                              className="gap-2"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Satışa Aç
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintBarcode(device)}
                              className="gap-2"
                            >
                              <Printer className="w-4 h-4" />
                              Barkod
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Satışa Hazır Cihazlar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Satışa Hazır Cihazlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedDevices.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz satışa hazır cihaz yok</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Marka</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Giriş Tarihi</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                      <TableCell>{device.brand}</TableCell>
                      <TableCell>{device.model}</TableCell>
                      <TableCell>{new Date(device.entry_date).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Satışa Hazır
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintBarcode(device)}
                          className="gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          Barkod
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barkod Yazdırma Dialog */}
      <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Barkod Etiketi Yazdır</DialogTitle>
            <DialogDescription>
              10x10 cm barkod etiketi yazdırılacak. QR kod içinde IMEI, yapılan işlemler ve fiyatlar yer alacak.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDeviceForBarcode && barcodeData && (
            <div className="space-y-4 py-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="font-semibold mb-2">
                  {selectedDeviceForBarcode.brand} {selectedDeviceForBarcode.model}
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  IMEI: {selectedDeviceForBarcode.imei}
                </div>
                
                <div className="text-sm">
                  <div className="font-semibold mb-2">Yapılan İşlemler:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {barcodeData.defects.map((defect, index) => (
                      <li key={index}>{defect}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="font-semibold">
                    Toplam Maliyet: {barcodeData.totalCost.toFixed(2)} ₺
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>• Etiket boyutu: 10x10 cm</p>
                <p>• QR kod tüm bilgileri içerecek</p>
                <p>• Yazdırma sonrası pencere otomatik kapanacak</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBarcodeDialog(false)}>
              İptal
            </Button>
            <Button onClick={generateAndPrintBarcode}>
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}