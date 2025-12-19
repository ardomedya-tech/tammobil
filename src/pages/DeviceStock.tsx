import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db, DeviceStock, Device } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Package, Send, Trash2 } from 'lucide-react';

export default function DeviceStockPage() {
  const { user } = useAuth();
  const [stock, setStock] = useState<DeviceStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    imei: '',
    stock_quantity: 1,
    purchase_price: 0
  });

  const loadStock = async () => {
    const stockData = await db.getDeviceStock();
    setStock(stockData);
    setLoading(false);
  };

  useEffect(() => {
    loadStock();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newStock: Omit<DeviceStock, 'id' | 'created_at'> = {
      brand: formData.brand,
      model: formData.model,
      imei: formData.imei,
      stock_quantity: formData.stock_quantity,
      purchase_price: formData.purchase_price,
      created_by: user?.id || ''
    };

    try {
      await db.addDeviceStock(newStock);
      await loadStock();
      toast.success('Stok başarıyla eklendi!');
      setIsDialogOpen(false);
      setFormData({ brand: '', model: '', imei: '', stock_quantity: 1, purchase_price: 0 });
    } catch (error) {
      toast.error('Stok eklenirken bir hata oluştu!');
      console.error('Add stock error:', error);
    }
  };

  const handleSendToDefectInspection = async (stockItem: DeviceStock) => {
    try {
      // Stoktan cihazı arıza tespitine gönder (pending_inspection durumunda)
      const newDevice: Omit<Device, 'id' | 'created_at'> = {
        imei: stockItem.imei,
        brand: stockItem.brand,
        model: stockItem.model,
        entry_date: new Date().toISOString(),
        status: 'pending_inspection',
        created_by: user?.id || ''
      };

      await db.addDevice(newDevice);

      // STOK SİLİNMESİN - Sadece bilgilendirme mesajı
      toast.success(`${stockItem.brand} ${stockItem.model} arıza tespitine gönderildi! Stok korundu.`);
      
      // Sayfayı yenile
      await loadStock();
    } catch (error) {
      toast.error('Arıza tespitine gönderilirken bir hata oluştu!');
      console.error('Send to defect inspection error:', error);
    }
  };

  const handleDelete = async (id: string, brand: string, model: string) => {
    try {
      await db.deleteDeviceStock(id);
      await loadStock();
      toast.success(`${brand} ${model} stoktan silindi!`);
    } catch (error) {
      toast.error('Stok silinirken bir hata oluştu!');
      console.error('Delete stock error:', error);
    }
  };

  const filteredStock = stock.filter(item =>
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.imei.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStockValue = stock.reduce((sum, item) => sum + (item.purchase_price * item.stock_quantity), 0);

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
            <h1 className="text-3xl font-bold text-gray-900">Cihaz Stok</h1>
            <p className="text-gray-600 mt-1">Stok cihazlarını görüntüleyin ve yönetin</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Stok Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Stok Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="stock_quantity">Stok Adeti</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="1"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Alış Fiyatı (₺)</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Stok Ekle</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Toplam Stok</h3>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stock.reduce((sum, item) => sum + item.stock_quantity, 0)}</div>
              <p className="text-xs text-muted-foreground">Adet cihaz</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Toplam Değer</h3>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{totalStockValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">Alış fiyatı toplamı</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Farklı Model</h3>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stock.length}</div>
              <p className="text-xs text-muted-foreground">Çeşit cihaz</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Marka, model veya IMEI ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStock.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Stok bulunamadı</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marka</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead className="text-center">Stok Adeti</TableHead>
                    <TableHead className="text-right">Alış Fiyatı</TableHead>
                    <TableHead className="text-right">Toplam Değer</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.brand}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="font-mono text-sm">{item.imei}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.stock_quantity} adet
                        </span>
                      </TableCell>
                      <TableCell className="text-right">₺{item.purchase_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-medium">₺{(item.purchase_price * item.stock_quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSendToDefectInspection(item)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Arıza Tespitine Gönder
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Stoku Sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu stoğu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                  <br /><br />
                                  <strong>Marka/Model:</strong> {item.brand} {item.model}<br />
                                  <strong>IMEI:</strong> {item.imei}<br />
                                  <strong>Stok Adeti:</strong> {item.stock_quantity}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id, item.brand, item.model)}>
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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