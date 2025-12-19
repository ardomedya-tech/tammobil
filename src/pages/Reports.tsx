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

interface Device {
  id: string;
  imei: string;
  brand: string;
  model: string;
  color: string;
  purchase_price: number;
  sale_price: number;
  status: string;
  created_at: string;
}

interface ServiceRequest {
  id: string;
  device_id: string;
  defect_description: string;
  service_cost: number;
  status: string;
  created_at: string;
  completed_at: string;
  devices: Device;
}

export default function Reports() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [pendingDevices, setPendingDevices] = useState<ServiceRequest[]>([]);
  const [stockDevices, setStockDevices] = useState<Device[]>([]);
  const [completedServices, setCompletedServices] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending service devices
      let pendingQuery = supabase
        .from('service_requests')
        .select(`
          *,
          devices (*)
        `)
        .eq('status', 'pending');

      if (startDate) {
        pendingQuery = pendingQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        pendingQuery = pendingQuery.lte('created_at', endOfDay.toISOString());
      }

      const { data: pendingData, error: pendingError } = await pendingQuery;
      if (pendingError) throw pendingError;
      setPendingDevices(pendingData || []);

      // Fetch stock devices
      let stockQuery = supabase
        .from('devices')
        .select('*')
        .eq('status', 'in_stock');

      if (startDate) {
        stockQuery = stockQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        stockQuery = stockQuery.lte('created_at', endOfDay.toISOString());
      }

      const { data: stockData, error: stockError } = await stockQuery;
      if (stockError) throw stockError;
      setStockDevices(stockData || []);

      // Fetch completed services
      let completedQuery = supabase
        .from('service_requests')
        .select(`
          *,
          devices (*)
        `)
        .eq('status', 'completed');

      if (startDate) {
        completedQuery = completedQuery.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        completedQuery = completedQuery.lte('completed_at', endOfDay.toISOString());
      }

      const { data: completedData, error: completedError } = await completedQuery;
      if (completedError) throw completedError;
      setCompletedServices(completedData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const exportPendingDevices = () => {
    const data = pendingDevices.map((sr) => ({
      'IMEI': sr.devices.imei,
      'Marka': sr.devices.brand,
      'Model': sr.devices.model,
      'Renk': sr.devices.color,
      'Arıza Açıklaması': sr.defect_description,
      'Giriş Tarihi': format(new Date(sr.created_at), 'dd/MM/yyyy HH:mm', { locale: tr }),
      'Durum': 'Beklemede'
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
    const data = stockDevices.map((device) => ({
      'IMEI': device.imei,
      'Marka': device.brand,
      'Model': device.model,
      'Renk': device.color,
      'Alış Fiyatı': device.purchase_price,
      'Satış Fiyatı': device.sale_price,
      'Kar Marjı': device.sale_price - device.purchase_price,
      'Giriş Tarihi': format(new Date(device.created_at), 'dd/MM/yyyy HH:mm', { locale: tr }),
      'Durum': 'Stokta'
    }));

    // Add summary row
    const totalPurchase = stockDevices.reduce((sum, d) => sum + d.purchase_price, 0);
    const totalSale = stockDevices.reduce((sum, d) => sum + d.sale_price, 0);
    const totalProfit = totalSale - totalPurchase;

    data.push({
      'IMEI': '',
      'Marka': '',
      'Model': '',
      'Renk': '',
      'Alış Fiyatı': totalPurchase,
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
      'IMEI': sr.devices.imei,
      'Marka': sr.devices.brand,
      'Model': sr.devices.model,
      'Arıza Açıklaması': sr.defect_description,
      'Teknik Servis Ücreti': sr.service_cost,
      'Giriş Tarihi': format(new Date(sr.created_at), 'dd/MM/yyyy HH:mm', { locale: tr }),
      'Tamamlanma Tarihi': format(new Date(sr.completed_at), 'dd/MM/yyyy HH:mm', { locale: tr }),
      'Durum': 'Tamamlandı'
    }));

    // Add summary row
    const totalServiceCost = completedServices.reduce((sum, sr) => sum + (sr.service_cost || 0), 0);

    data.push({
      'IMEI': '',
      'Marka': '',
      'Model': '',
      'Arıza Açıklaması': '',
      'Teknik Servis Ücreti': totalServiceCost,
      'Giriş Tarihi': '',
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
                    Toplam {pendingDevices.length} cihaz beklemede
                  </CardDescription>
                </div>
                <Button onClick={exportPendingDevices} disabled={loading || pendingDevices.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel İndir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Yükleniyor...</p>
              ) : pendingDevices.length === 0 ? (
                <p className="text-center text-muted-foreground">Bekleyen cihaz bulunamadı</p>
              ) : (
                <div className="space-y-2">
                  {pendingDevices.map((sr) => (
                    <div key={sr.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{sr.devices.brand} {sr.devices.model}</p>
                        <p className="text-sm text-muted-foreground">IMEI: {sr.devices.imei}</p>
                        <p className="text-sm text-muted-foreground">Arıza: {sr.defect_description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(sr.created_at), 'dd/MM/yyyy', { locale: tr })}
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
                  {stockDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{device.brand} {device.model}</p>
                        <p className="text-sm text-muted-foreground">IMEI: {device.imei}</p>
                        <p className="text-sm text-muted-foreground">
                          Alış: ₺{device.purchase_price} | Satış: ₺{device.sale_price}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          Kar: ₺{device.sale_price - device.purchase_price}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(device.created_at), 'dd/MM/yyyy', { locale: tr })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-2 font-bold">
                    <p>TOPLAM</p>
                    <div className="text-right">
                      <p className="text-green-600">
                        Toplam Kar: ₺{stockDevices.reduce((sum, d) => sum + (d.sale_price - d.purchase_price), 0)}
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
                        <p className="font-medium">{sr.devices.brand} {sr.devices.model}</p>
                        <p className="text-sm text-muted-foreground">IMEI: {sr.devices.imei}</p>
                        <p className="text-sm text-muted-foreground">Arıza: {sr.defect_description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-blue-600">₺{sr.service_cost || 0}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(sr.completed_at), 'dd/MM/yyyy', { locale: tr })}
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
  );
}