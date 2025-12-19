import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/supabase';
import { Smartphone, AlertCircle, Send, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Device, Defect, ServiceRequest } from '@/lib/supabase';

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [devicesData, defectsData, serviceRequestsData] = await Promise.all([
          db.getDevices(),
          db.getDefects(),
          db.getServiceRequests()
        ]);
        
        setDevices(devicesData);
        setDefects(defectsData);
        setServiceRequests(serviceRequestsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = [
    {
      title: 'Toplam Cihaz',
      value: devices.length,
      icon: Smartphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Tespit Edilen Arızalar',
      value: defects.length,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Servise Gönderilen',
      value: serviceRequests.filter(r => r.status === 'sent' || r.status === 'in_progress').length,
      icon: Send,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Tamamlanan',
      value: devices.filter(d => d.status === 'completed').length,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  const recentDevices = devices.slice(0, 5);

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
          <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa</h1>
          <p className="text-gray-600 mt-1">Cep telefonu yenileme merkezi yönetim paneli</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Son Eklenen Cihazlar</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDevices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz cihaz eklenmemiş</p>
            ) : (
              <div className="space-y-4">
                {recentDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{device.brand} {device.model}</p>
                        <p className="text-sm text-gray-500">IMEI: {device.imei}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        device.status === 'completed' ? 'bg-green-100 text-green-800' :
                        device.status === 'in_service' ? 'bg-orange-100 text-orange-800' :
                        device.status === 'inspected' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {device.status === 'pending_inspection' && 'Kontrol Bekliyor'}
                        {device.status === 'inspected' && 'Kontrol Edildi'}
                        {device.status === 'in_service' && 'Serviste'}
                        {device.status === 'repaired' && 'Tamir Edildi'}
                        {device.status === 'completed' && 'Tamamlandı'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}