import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db, Device, Defect, ServiceRequest } from '@/lib/supabase';
import { BarChart3, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export default function Reports() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [devicesData, defectsData, requestsData] = await Promise.all([
        db.getDevices(),
        db.getDefects(),
        db.getServiceRequests()
      ]);
      
      setDevices(devicesData);
      setDefects(defectsData);
      setServiceRequests(requestsData);
      setLoading(false);
    };

    loadData();
  }, []);

  // Arıza tiplerine göre istatistikler
  const defectStats = defects.reduce((acc, defect) => {
    acc[defect.defect_type] = (acc[defect.defect_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const defectLabels: Record<string, string> = {
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

  // Durum istatistikleri
  const statusStats = devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Servis performansı
  const completedServices = serviceRequests.filter(r => r.status === 'completed').length;
  const completedWithDates = serviceRequests.filter(r => r.status === 'completed' && r.completed_at && r.sent_at);
  
  const avgCompletionTime = completedWithDates.length > 0
    ? completedWithDates.reduce((sum, r) => {
        const start = new Date(r.sent_at).getTime();
        const end = new Date(r.completed_at!).getTime();
        return sum + (end - start);
      }, 0) / completedWithDates.length
    : 0;

  const avgDays = Math.round(avgCompletionTime / (1000 * 60 * 60 * 24));

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
          <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-600 mt-1">Detaylı istatistikler ve performans metrikleri</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Cihaz</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{devices.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Arıza</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{defects.length}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ort. Tamir Süresi</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{avgDays} gün</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{completedServices}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Arıza Tiplerine Göre Dağılım</CardTitle>
            </CardHeader>
            <CardContent>
              {defects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Henüz arıza kaydı yok
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(defectStats).map(([type, count]) => {
                    const percentage = (count / defects.length) * 100;
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {defectLabels[type] || type}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cihaz Durumları</CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Henüz cihaz kaydı yok
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(statusStats).map(([status, count]) => {
                    const percentage = (count / devices.length) * 100;
                    const statusLabels: Record<string, string> = {
                      pending_inspection: 'Kontrol Bekliyor',
                      inspected: 'Kontrol Edildi',
                      in_service: 'Serviste',
                      repaired: 'Tamir Edildi',
                      completed: 'Tamamlandı'
                    };
                    
                    return (
                      <div key={status}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {statusLabels[status] || status}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Servis Performansı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Bekleyen İstekler</p>
                <p className="text-4xl font-bold text-orange-600 mt-2">
                  {serviceRequests.filter(r => r.status === 'sent').length}
                </p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">İşlemdeki İstekler</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">
                  {serviceRequests.filter(r => r.status === 'in_progress').length}
                </p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Tamamlanan İstekler</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  {completedServices}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}