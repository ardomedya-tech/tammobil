import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { db, ServiceRequest, Device } from '@/lib/supabase';
import { DollarSign, TrendingUp } from 'lucide-react';

export default function ServiceCosts() {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [requestsData, devicesData] = await Promise.all([
        db.getServiceRequests(),
        db.getDevices()
      ]);
      
      setServiceRequests(requestsData);
      setDevices(devicesData);
      setLoading(false);
    };

    loadData();
  }, []);

  const completedServices = serviceRequests.filter(r => r.status === 'completed' && r.service_cost > 0);
  
  const totalCost = completedServices.reduce((sum, service) => sum + service.service_cost, 0);
  const averageCost = completedServices.length > 0 ? totalCost / completedServices.length : 0;

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
          <h1 className="text-3xl font-bold text-gray-900">Teknik Servis Ücretleri</h1>
          <p className="text-gray-600 mt-1">Tamamlanan servislerin maliyet takibi</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Servis Ücreti</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₺{totalCost.toFixed(2)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ortalama Ücret</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₺{averageCost.toFixed(2)}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tamamlanan Servis</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{completedServices.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Servis Ücret Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            {completedServices.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz tamamlanmış servis yok</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cihaz</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Gönderilme</TableHead>
                    <TableHead>Tamamlanma</TableHead>
                    <TableHead>Servis Ücreti</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedServices.map((service) => {
                    const device = devices.find(d => d.id === service.device_id);
                    if (!device) return null;

                    return (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">
                          {device.brand} {device.model}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(service.sent_at).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {service.completed_at ? new Date(service.completed_at).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          ₺{service.service_cost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            Tamamlandı
                          </Badge>
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
    </DashboardLayout>
  );
}