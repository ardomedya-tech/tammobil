import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DefectPrintReport } from '@/components/DefectPrintReport';
import { db, Defect, Device } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, Trash2 } from 'lucide-react';

const defectTypes = [
  { value: 'screen', label: 'Ekran' },
  { value: 'battery', label: 'Batarya' },
  { value: 'camera', label: 'Kamera' },
  { value: 'software', label: 'Yazılım' },
  { value: 'speaker', label: 'Hoparlör' },
  { value: 'microphone', label: 'Mikrofon' },
  { value: 'charging_port', label: 'Şarj Portu' },
  { value: 'refurbishment', label: 'Yenileme' },
  { value: 'other', label: 'Diğer' }
];

type DefectType = 'screen' | 'battery' | 'camera' | 'software' | 'speaker' | 'microphone' | 'charging_port' | 'refurbishment' | 'other';
type SeverityType = 'low' | 'medium' | 'high';

export default function Defects() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityType>('medium');
  const [deviceDefects, setDeviceDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const devicesData = await db.getDevices();
    const filteredDevices = devicesData.filter(d => d.status === 'pending_inspection' || d.status === 'inspected');
    setDevices(filteredDevices);
    setLoading(false);
  };

  const loadDeviceDefects = async (deviceId: string) => {
    if (deviceId) {
      const defects = await db.getDefectsByDevice(deviceId);
      setDeviceDefects(defects);
    } else {
      setDeviceDefects([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadDeviceDefects(selectedDevice);
  }, [selectedDevice]);

  const handleDefectToggle = (defectType: string) => {
    setSelectedDefects(prev => 
      prev.includes(defectType)
        ? prev.filter(d => d !== defectType)
        : [...prev, defectType]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDevice) {
      toast.error('Lütfen bir cihaz seçin');
      return;
    }

    if (selectedDefects.length === 0) {
      toast.error('Lütfen en az bir arıza tipi seçin');
      return;
    }

    for (const defectType of selectedDefects) {
      const newDefect: Omit<Defect, 'id' | 'detected_at'> = {
        device_id: selectedDevice,
        defect_type: defectType as DefectType,
        description,
        severity,
        detected_by: user?.id || ''
      };
      await db.addDefect(newDefect);
    }

    // Cihaz durumunu güncelle
    await db.updateDevice(selectedDevice, { status: 'inspected' });

    toast.success(`${selectedDefects.length} arıza kaydedildi!`);
    setSelectedDefects([]);
    setDescription('');
    setSeverity('medium');
    await loadData();
    await loadDeviceDefects(selectedDevice);
  };

  const handleDeleteDefect = async (defectId: string) => {
    await db.deleteDefect(defectId);
    toast.success('Arıza kaydı silindi');
    await loadDeviceDefects(selectedDevice);
  };

  const selectedDeviceData = devices.find(d => d.id === selectedDevice);

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
          <h1 className="text-3xl font-bold text-gray-900">Arıza Tespiti</h1>
          <p className="text-gray-600 mt-1">Cihazlardaki arızaları tespit edin ve kaydedin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Yeni Arıza Kaydı</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device">Cihaz Seçin</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cihaz seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.brand} {device.model} - {device.imei}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDeviceData && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Seçili Cihaz</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {selectedDeviceData.brand} {selectedDeviceData.model}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">IMEI: {selectedDeviceData.imei}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Arıza Tipleri</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {defectTypes.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.value}
                          checked={selectedDefects.includes(type.value)}
                          onCheckedChange={() => handleDefectToggle(type.value)}
                        />
                        <label
                          htmlFor={type.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">Öncelik Seviyesi</Label>
                  <Select value={severity} onValueChange={(value: string) => setSeverity(value as SeverityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                  <Textarea
                    id="description"
                    placeholder="Arıza hakkında detaylı bilgi..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={!selectedDevice || selectedDefects.length === 0}>
                  Arızaları Kaydet
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tespit Edilen Arızalar</CardTitle>
                {selectedDeviceData && deviceDefects.length > 0 && (
                  <DefectPrintReport device={selectedDeviceData} defects={deviceDefects} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDevice ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Arızaları görmek için bir cihaz seçin</p>
                </div>
              ) : deviceDefects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Bu cihaz için henüz arıza kaydı yok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deviceDefects.map((defect) => (
                    <div key={defect.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {defectTypes.find(t => t.value === defect.defect_type)?.label}
                          </p>
                          {defect.description && (
                            <p className="text-sm text-gray-600 mt-1">{defect.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(defect.detected_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            defect.severity === 'high' ? 'bg-red-100 text-red-800' :
                            defect.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {defect.severity === 'high' && 'Yüksek'}
                            {defect.severity === 'medium' && 'Orta'}
                            {defect.severity === 'low' && 'Düşük'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDefect(defect.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}