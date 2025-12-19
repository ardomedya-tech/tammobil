import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db, ServiceRequest, Device } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Package, CheckCircle, Clock, Wrench } from 'lucide-react';

export default function Service() {
  const { user } = useAuth();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [serviceCost, setServiceCost] = useState<string>('');
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [pendingCompletionRequest, setPendingCompletionRequest] = useState<ServiceRequest | null>(null);

  const loadData = async () => {
    const [requests, devicesData] = await Promise.all([
      db.getServiceRequests(),
      db.getDevices()
    ]);
    setServiceRequests(requests);
    setDevices(devicesData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestClick = (request: ServiceRequest) => {
    setPendingCompletionRequest(request);
    setServiceCost('');
    setShowCompletionDialog(true);
  };

  const handleCompleteService = async () => {
    if (!pendingCompletionRequest) return;

    if (!serviceCost || parseFloat(serviceCost) < 0) {
      toast.error('Lütfen geçerli bir servis maliyeti girin');
      return;
    }

    await db.updateServiceRequest(pendingCompletionRequest.id, {
      status: 'completed',
      service_cost: parseFloat(serviceCost),
      completed_at: new Date().toISOString()
    });

    await db.updateDevice(pendingCompletionRequest.device_id, { status: 'repaired' });

    const device = devices.find(d => d.id === pendingCompletionRequest.device_id);
    if (device) {
      await db.updateDeviceStockByImei(device.imei, {
        service_cost: parseFloat(serviceCost)
      });
    }

    toast.success('Servis tamamlandı ve maliyet kaydedildi!');
    setShowCompletionDialog(false);
    setPendingCompletionRequest(null);
    setServiceCost('');
    setSelectedRequest('');
    await loadData();
  };

  const getDeviceInfo = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? `${device.brand} ${device.model} - ${device.imei}` : 'Bilinmeyen Cihaz';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Gönderildi</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Wrench className="w-3 h-3 mr-1" />İşlemde</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Tamamlandı</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingRequests = serviceRequests.filter(r => r.status !== 'completed');
  const completedRequests = serviceRequests.filter(r => r.status === 'completed');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servis Yönetimi</h1>
          <p className="text-gray-600 mt-1">Servise gönderilen cihazları takip edin ve tamamlayın</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Servis Tamamla</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request">Servis Talebi Seçin</Label>
                <Select value={selectedRequest} onValueChange={setSelectedRequest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bekleyen servis talebi seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingRequests.map((request) => (
                      <SelectItem key={request.id} value={request.id}>
                        {getDeviceInfo(request.device_id)} - {request.status === 'sent' ? 'Gönderildi' : 'İşlemde'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRequest && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">Seçili Servis Talebi</p>
                  <p className="text-sm text-blue-700 mt-1">
                    {getDeviceInfo(pendingRequests.find(r => r.id === selectedRequest)?.device_id || '')}
                  </p>
                </div>
              )}

              {/* Bekleyen Servisler Listesi */}
              <div className="space-y-2">
                <Label>Bekleyen Servisler</Label>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Bekleyen servis talebi yok</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pendingRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                        onClick={() => handleRequestClick(request)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">
                              {getDeviceInfo(request.device_id)}
                            </p>
                            {request.notes && (
                              <p className="text-xs text-gray-600 mt-1">{request.notes}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Gönderilme: {new Date(request.sent_at).toLocaleString('tr-TR')}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Bekleyen Servisler Özeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Bekleyen servis talebi yok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {getDeviceInfo(request.device_id)}
                          </p>
                          {request.notes && (
                            <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Gönderilme: {new Date(request.sent_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Tamamlanan Servisler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Henüz tamamlanmış servis yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {getDeviceInfo(request.device_id)}
                        </p>
                        {request.notes && (
                          <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs text-gray-500">
                            Gönderilme: {new Date(request.sent_at).toLocaleString('tr-TR')}
                          </p>
                          {request.completed_at && (
                            <p className="text-xs text-gray-500">
                              Tamamlanma: {new Date(request.completed_at).toLocaleString('tr-TR')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(request.status)}
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {request.service_cost.toFixed(2)} ₺
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Servis Tamamlama Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Servisi Tamamla</DialogTitle>
            <DialogDescription>
              {pendingCompletionRequest && getDeviceInfo(pendingCompletionRequest.device_id)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialogServiceCost">Teknik Servis Ücreti (₺)</Label>
              <Input
                id="dialogServiceCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={serviceCost}
                onChange={(e) => setServiceCost(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleCompleteService}
              disabled={!serviceCost || parseFloat(serviceCost) < 0}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Servisi Tamamla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}