import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Device {
  id: string;
  imei: string;
  brand: string;
  model: string;
  entry_date: string;
  status: string;
  created_at: string;
}

interface DeviceStock {
  id: string;
  imei: string;
  brand: string;
  model: string;
  purchase_price: number;
  service_cost: number;
  created_at: string;
}

interface ServiceRequest {
  id: string;
  device_id: string;
  status: string;
  notes: string;
  service_cost: number;
  sent_at: string;
  completed_at: string;
}

interface ServiceRequestWithDevice extends ServiceRequest {
  device: Device;
}

interface DefectWithDevice {
  id: string;
  device_id: string;
  defect_type: string;
  description: string;
  severity: string;
  detected_at: string;
  device: Device;
}

export default function Reports() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [pendingServices, setPendingServices] = useState<ServiceRequestWithDevice[]>([]);
  const [stockDevices, setStockDevices] = useState<DeviceStock[]>([]);
  const [completedServices, setCompletedServices] = useState<ServiceRequestWithDevice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending service requests with device info
      let pendingQuery = supabase
        .from('app_74b74e94ab_service_requests')
        .select(`
          *,
          device:app_74b74e94ab_devices(*)
        `)
        .in('status', ['sent', 'in_progress']);

      if (startDate) {
        pendingQuery = pendingQuery.gte('sent_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        pendingQuery = pendingQuery.lte('sent_at', endOfDay.toISOString());
      }

      const { data: pendingData, error: pendingError } = await pendingQuery;
      if (pendingError) {
        console.error('Error fetching pending services:', pendingError);
        throw pendingError;
      }
      setPendingServices(pendingData || []);

      // Fetch stock devices
      let stockQuery = supabase
        .from('app_74b74e94ab_device_stock')
        .select('*');

      if (startDate) {
        stockQuery = stockQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        stockQuery = stockQuery.lte('created_at', endOfDay.toISOString());
      }

      const { data: stockData, error: stockError } = await stockQuery;
      if (stockError) {
        console.error('Error fetching stock devices:', stockError);
        throw stockError;
      }
      setStockDevices(stockData || []);

      // Fetch completed services with device info
      let completedQuery = supabase
        .from('app_74b74e94ab_service_requests')
        .select(`
          *,
          device:app_74b74e94ab_devices(*)
        `)
        .eq('status', 'completed')
        .not('completed_at', 'is', null);

      if (startDate) {
        completedQuery = completedQuery.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        completedQuery = completedQuery.lte('completed_at', endOfDay.toISOString());
      }

      const { data: completedData, error: completedError } = await completedQuery;
      if (completedError) {
        console.error('Error fetching completed services:', completedError);
        throw completedError;
      }
      setCompletedServices(completedData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const exportPendingDevices = () => {
    const data = pendingServices.map((sr) => ({
      'IMEI': sr.device?.imei || 'N/A',
      'Marka': sr.device?.brand || 'N/A',
      'Model': sr.device?.model || 'N/A',
      'Notlar': sr.notes || '-',
      'Gönderilme Tarihi': format(new Date(sr.sent_at), 'dd/MM/yyyy HH:mm', { locale: tr }),
      'Durum': sr.status === 'sent' ? 'Gönderildi' : 'İşlemde'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bekleyen Cihazlar');

    const dateRange = startDate && endDate
      ? `_${format(startDate, 'dd-MM-yyyy')}_${format(endDate, 'dd-MM-yyyy')}`
      : '';
    XLSX.writeFile(wb, `Bekleyen_Cihazlar${dateRange}.xlsx`);
    toast.success('Excel raporu indirildi');
  };

  const exportStockDevices = () => {
    const data = stockDevices.map((device) => {
      const salePrice = (device.purchase_price || 0) + (device.service_cost || 0);
      const profit = salePrice - (device.purchase_price || 0);
      
      return {
        'IMEI': device.imei,
        'Marka': device.brand,
        'Model': device.model,
        'Alış Fiyatı': device.purchase_price || 0,
        'Servis Maliyeti': device.service_cost || 0,
        'Satış Fiyatı': salePrice,
        'Kar Marjı': profit,
        'Giriş Tarihi': format(new Date(device.created_at), 'dd/MM/yyyy HH:mm', { locale: tr }),
        'Durum': 'Stokta'
      };
    });

    // Add summary row
    const totalPurchase = stockDevices.reduce((sum, d) => sum + (d.purchase_price || 0), 0);
    const totalServiceCost = stockDevices.reduce((sum, d) => sum + (d.service_cost || 0), 0);
    const totalSale = totalPurchase + totalServiceCost;
    const totalProfit = totalServiceCost;

    data.push({
      'IMEI': '',
      'Marka': '',
      'Model': '',
      'Alış Fiyatı': totalPurchase,
      'Servis Maliyeti': totalServiceCost,
      'Satış Fiyatı': totalSale,
      'Kar Marjı': totalProfit,
      'Giriş Tarihi': 'TOPLAM',
      'Durum': ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Cihazlar');

    const dateRange = startDate && endDate
      ? `_${format(startDate, 'dd-MM-yyyy')}_${format(endDate, 'dd-MM-yyyy')}`
      : '';
    XLSX.writeFile(wb, `Stok_Cihazlar${dateRange}.xlsx`);
    toast.success('Excel raporu indirildi');
  };

  const exportServiceFees = () => {
    const data = completedServices.map((sr) => ({
      'IMEI': sr.device?.imei || 'N/A',
      'Marka': sr.device?.brand || 'N/A',
      'Model': sr.device?.model || 'N/A',
      'Notlar': sr.notes || '-',
      'Teknik Servis Ücreti': sr.service_cost || 0,
      'Gönderilme Tarihi': format(new Date(sr.sent_at), 'dd/MM/yyyy HH:mm', { locale: tr }),
      'Tamamlanma Tarihi': sr.completed_at ? format(new Date(sr.completed_at), 'dd/MM/yyyy HH:mm', { locale: tr }) : '-',
      'Durum': 'Tamamlandı'
    }));

    // Add summary row
    const totalServiceCost = completedServices.reduce((sum, sr) => sum + (sr.service_cost || 0), 0);

    data.push({
      'IMEI': '',
      'Marka': '',
      'Model': '',
      'Notlar': '',
      'Teknik Servis Ücreti': totalServiceCost,
      'Gönderilme Tarihi': '',
      'Tamamlanma Tarihi': 'TOPLAM',
      'Durum': ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servis Ücretleri');

    const dateRange = startDate && endDate
      ? `_${format(startDate, 'dd-MM-yyyy')}_${format(endDate, 'dd-MM-yyyy')}`
      : '';
    XLSX.writeFile(wb, `Servis_Ucretleri${dateRange}.xlsx`);
    toast.success('Excel raporu indirildi');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground">Excel raporları oluşturun ve indirin</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tarih Aralığı Seçin</CardTitle>
            <CardDescription>Rapor için başlangıç ve bitiş tarihlerini seçin (opsiyonel)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Başlangıç Tarihi</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd MMMM yyyy', { locale: tr }) : 'Tarih seçin'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bitiş Tarihi</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd MMMM yyyy', { locale: tr }) : 'Tarih seçin'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(startDate || endDate) && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                  >
                    Tarihleri Temizle
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Bekleyen Cihazlar</TabsTrigger>
            <TabsTrigger value="stock">Stok Cihazlar</TabsTrigger>
            <TabsTrigger value="services">Servis Ücretleri</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Teknik Serviste Bekleyen Cihazlar</CardTitle>
                    <CardDescription>
                      Toplam {pendingServices.length} cihaz beklemede
                    </CardDescription>
                  </div>
                  <Button onClick={exportPendingDevices} disabled={loading || pendingServices.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel İndir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground">Yükleniyor...</p>
                ) : pendingServices.length === 0 ? (
                  <p className="text-center text-muted-foreground">Bekleyen cihaz bulunamadı</p>
                ) : (
                  <div className="space-y-2">
                    {pendingServices.map((sr) => (
                      <div key={sr.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">{sr.device?.brand} {sr.device?.model}</p>
                          <p className="text-sm text-muted-foreground">IMEI: {sr.device?.imei}</p>
                          <p className="text-sm text-muted-foreground">Notlar: {sr.notes || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(sr.sent_at), 'dd/MM/yyyy', { locale: tr })}
                          </p>
                          <p className="text-sm font-medium">
                            {sr.status === 'sent' ? 'Gönderildi' : 'İşlemde'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Stokdaki Cihazlar</CardTitle>
                    <CardDescription>
                      Toplam {stockDevices.length} cihaz stokta
                    </CardDescription>
                  </div>
                  <Button onClick={exportStockDevices} disabled={loading || stockDevices.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel İndir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground">Yükleniyor...</p>
                ) : stockDevices.length === 0 ? (
                  <p className="text-center text-muted-foreground">Stokta cihaz bulunamadı</p>
                ) : (
                  <div className="space-y-2">
                    {stockDevices.map((device) => {
                      const salePrice = (device.purchase_price || 0) + (device.service_cost || 0);
                      const profit = device.service_cost || 0;
                      
                      return (
                        <div key={device.id} className="flex items-center justify-between border-b pb-2">
                          <div>
                            <p className="font-medium">{device.brand} {device.model}</p>
                            <p className="text-sm text-muted-foreground">IMEI: {device.imei}</p>
                            <p className="text-sm text-muted-foreground">
                              Alış: ₺{device.purchase_price || 0} | Servis: ₺{device.service_cost || 0} | Satış: ₺{salePrice}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              Kar: ₺{profit}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(device.created_at), 'dd/MM/yyyy', { locale: tr })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t pt-2 font-bold">
                      <p>TOPLAM</p>
                      <div className="text-right">
                        <p className="text-green-600">
                          Toplam Kar: ₺{stockDevices.reduce((sum, d) => sum + (d.service_cost || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Teknik Servis Ücretleri</CardTitle>
                    <CardDescription>
                      Toplam {completedServices.length} tamamlanmış servis
                    </CardDescription>
                  </div>
                  <Button onClick={exportServiceFees} disabled={loading || completedServices.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel İndir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground">Yükleniyor...</p>
                ) : completedServices.length === 0 ? (
                  <p className="text-center text-muted-foreground">Tamamlanmış servis bulunamadı</p>
                ) : (
                  <div className="space-y-2">
                    {completedServices.map((sr) => (
                      <div key={sr.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">{sr.device?.brand} {sr.device?.model}</p>
                          <p className="text-sm text-muted-foreground">IMEI: {sr.device?.imei}</p>
                          <p className="text-sm text-muted-foreground">Notlar: {sr.notes || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-blue-600">₺{sr.service_cost || 0}</p>
                          <p className="text-sm text-muted-foreground">
                            {sr.completed_at ? format(new Date(sr.completed_at), 'dd/MM/yyyy', { locale: tr }) : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t pt-2 font-bold">
                      <p>TOPLAM</p>
                      <p className="text-blue-600">
                        ₺{completedServices.reduce((sum, sr) => sum + (sr.service_cost || 0), 0)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}