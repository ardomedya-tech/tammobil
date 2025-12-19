import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db, ServiceRequest, Device, Defect } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Package, CheckCircle } from 'lucide-react';

export default function Service() {
  const { user } = useAuth();
  const [inspectedDevices, setInspectedDevices] = useState<Device[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [allDefects, setAllDefects] = useState<Defect[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [notes, setNotes] = useState('');
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [devicesData, requestsData, defectsData] = await Promise.all([
      db.getDevices(),
      db.getServiceRequests(),
      db.getDefects()
    ]);
    
    const filtered = devicesData.filter(d => d.status === 'inspected');
    setInspectedDevices(filtered);
    setAllDevices(devicesData);
    setServiceRequests(requestsData);
    setAllDefects(defectsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendToService = async () => {
    if (!selectedDevice) {
      toast.error('Lütfen bir cihaz seçin');
      return;
    }

    const newRequest: Omit<ServiceRequest, 'id' | 'sent_at'> = {
      device_id: selectedDevice,
      status: 'sent',
      notes,
      service_cost: 0,
      sent_by: user?.id || ''
    };

    await db.addServiceRequest(newRequest);
    await db.updateDevice(selectedDevice, { status: 'in_service' });

    toast.success('Cihaz teknik servise gönderildi!');
    setSelectedDevice('');
    setNotes('');
    await loadData();
  };

  const handleCompleteService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setShowCostDialog(true);
  };

  const handleSaveCost = async () => {
    if (!serviceCost || parseFloat(serviceCost) < 0) {
      toast.error('Lütfen geçerli bir ücret girin');
      return;
    }

    const service = serviceRequests.find(s => s.id === selectedServiceId);
    if (!service) return;

    const cost = parseFloat(serviceCost);

    // Servis talebini güncelle
    await db.updateServiceRequest(selectedServiceId, {
      status: 'completed',
      service_cost: cost,
      completed_at: new Date().toISOString()
    });

    // Cihaz durumunu güncelle
    await db.updateDevice(service.device_id, { status: 'repaired' });

    // Cihazın IMEI'sini al
    const device = allDevices.find(d => d.id === service.device_id);
    if (device) {
      // IMEI ile stok tablosunda eşleşme var mı kontrol et ve service_cost'u güncelle
      try {
        const updatedStock = await db.updateDeviceStockByImei(device.imei, {
          service_cost: cost
        });
        
        if (updatedStock) {
          toast.success(`Servis tamamlandı! Ücret: ${cost} ₺ (Stok güncellendi)`);
        } else {
          toast.success(`Servis tamamlandı! Ücret: ${cost} ₺`);
        }
      } catch (error) {
        console.error('Stok güncelleme hatası:', error);
        toast.success(`Servis tamamlandı! Ücret: ${cost} ₺`);
      }
    } else {
      toast.success(`Servis tamamlandı! Ücret: ${cost} ₺`);
    }

    setShowCostDialog(false);
    setServiceCost('');
    setSelectedServiceId('');
    await loadData();
  };

  // Cihaz için teknisyen ve öncelik bilgisini al
  const getDeviceInfo = (deviceId: string) => {
    const deviceDefects = allDefects.filter(d => d.device_id === deviceId);
    
    if (deviceDefects.length === 0) {
      return { technician: '-', priority: '-' };
    }

    // En yüksek öncelik seviyesini bul
    const priorities = deviceDefects.map(d => d.severity);
    const highestPriority = priorities.includes('high') ? 'high' : 
                           priorities.includes('medium') ? 'medium' : 'low';

    // Teknisyen bilgisini description'dan çıkar
    let technician = '-';
    for (const defect of deviceDefects) {
      if (defect.description && defect.description.includes('Teknisyen:')) {
        const match = defect.description.match(/Teknisyen:\s*([^\|]+)/);
        if (match) {
          technician = match[1].trim();
          break;
        }
      }
    }

    return { technician, priority: highestPriority };
  };

  const activeRequests = serviceRequests.filter(r => r.status !== 'completed');

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
          <h1 className="text-3xl font-bold text-gray-900">Teknik Servis</h1>
          <p className="text-gray-600 mt-1">Cihazları teknik servise gönderin ve takip edin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Servise Gönder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device">Cihaz Seçin</Label>
                  <select
                    id="device"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Cihaz seçin...</option>
                    {inspectedDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.brand} {device.model} - {device.imei}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Servis Notları (Opsiyonel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Teknik servis için özel notlar..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSendToService}
                  className="w-full"
                  disabled={!selectedDevice}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Servise Gönder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Servis İstatistikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Serviste</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {serviceRequests.filter(r => r.status === 'sent' || r.status === 'in_progress').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Tamamlanan</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {serviceRequests.filter(r => r.status === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aktif Servis Talepleri</CardTitle>
          </CardHeader>
          <CardContent>
            {activeRequests.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aktif servis talebi yok</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cihaz</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Teknisyen</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Gönderilme Tarihi</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRequests.map((request) => {
                    const device = allDevices.find(d => d.id === request.device_id);
                    if (!device) return null;

                    const { technician, priority } = getDeviceInfo(request.device_id);

                    return (
                      <TableRow key={request.id}>
                        <TableCell>{device.brand} {device.model}</TableCell>
                        <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">{technician}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            priority === 'high' ? 'bg-red-100 text-red-800' :
                            priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {priority === 'high' && 'Yüksek'}
                            {priority === 'medium' && 'Orta'}
                            {priority === 'low' && 'Düşük'}
                            {priority === '-' && '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.sent_at).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>
                          <Badge className={
                            request.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }>
                            {request.status === 'sent' ? 'Gönderildi' : 'İşlemde'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleCompleteService(request.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Tamamlandı
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teknik Servis Ücreti</DialogTitle>
            <DialogDescription>
              Lütfen bu cihaz için yapılan teknik servis ücretini girin. Ücret, IMEI ile eşleşen stok kaydına otomatik olarak eklenecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Servis Ücreti (₺)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={serviceCost}
                onChange={(e) => setServiceCost(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCostDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveCost}>
              Kaydet ve Tamamla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}