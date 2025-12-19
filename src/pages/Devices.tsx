import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db, Device } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Smartphone, Trash2 } from 'lucide-react';

export default function Devices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    imei: '',
    brand: '',
    model: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  const loadDevices = async () => {
    const devicesData = await db.getDevices();
    setDevices(devicesData);
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newDevice: Omit<Device, 'id' | 'created_at'> = {
      imei: formData.imei,
      brand: formData.brand,
      model: formData.model,
      entry_date: formData.entry_date,
      status: 'pending_inspection',
      created_by: user?.id || ''
    };

    await db.addDevice(newDevice);
    await loadDevices();
    toast.success('Cihaz başarıyla eklendi!');
    setIsDialogOpen(false);
    setFormData({ imei: '', brand: '', model: '', entry_date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = async (id: string, imei: string) => {
    try {
      await db.deleteDevice(id);
      await loadDevices();
      toast.success(`Cihaz (${imei}) başarıyla silindi!`);
    } catch (error) {
      toast.error('Cihaz silinirken bir hata oluştu!');
      console.error('Delete error:', error);
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cihazlar</h1>
            <p className="text-gray-600 mt-1">Tüm cihazları görüntüleyin ve yönetin</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Cihaz Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Cihaz Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imei">IMEI</Label>
                  <Input
                    id="imei"
                    placeholder="123456789012345"
                    value={formData.imei}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marka</Label>
                  <Input
                    id="brand"
                    placeholder="Apple, Samsung, Xiaomi..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="iPhone 13, Galaxy S21..."
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry_date">Giriş Tarihi</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Cihaz Ekle</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="IMEI, marka veya model ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="pending_inspection">Kontrol Bekliyor</SelectItem>
                  <SelectItem value="inspected">Kontrol Edildi</SelectItem>
                  <SelectItem value="in_service">Serviste</SelectItem>
                  <SelectItem value="repaired">Tamir Edildi</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDevices.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Cihaz bulunamadı</p>
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
                    <TableHead className="text-right">İşlemler</TableHead>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          device.status === 'completed' ? 'bg-green-100 text-green-800' :
                          device.status === 'in_service' ? 'bg-orange-100 text-orange-800' :
                          device.status === 'inspected' ? 'bg-blue-100 text-blue-800' :
                          device.status === 'repaired' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {device.status === 'pending_inspection' && 'Kontrol Bekliyor'}
                          {device.status === 'inspected' && 'Kontrol Edildi'}
                          {device.status === 'in_service' && 'Serviste'}
                          {device.status === 'repaired' && 'Tamir Edildi'}
                          {device.status === 'completed' && 'Tamamlandı'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cihazı Sil</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bu cihazı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                <br /><br />
                                <strong>IMEI:</strong> {device.imei}<br />
                                <strong>Marka/Model:</strong> {device.brand} {device.model}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(device.id, device.imei)}>
                                Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}