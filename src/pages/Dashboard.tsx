import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Wrench } from 'lucide-react';

interface TechnicianPerformance {
  technician_id: string;
  technician_name: string;
  assigned_count: number;
  in_progress_count: number;
  completed_count: number;
  total_active: number;
}

export default function Dashboard() {
  const [performanceData, setPerformanceData] = useState<TechnicianPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('service-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_0a8fd_services'
        },
        () => {
          fetchPerformanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users with Technician role
      const { data: technicians, error: techError } = await supabase
        .from('app_0a8fd_users')
        .select('id, name')
        .eq('role', 'Technician')
        .eq('approved', true);

      if (techError) throw techError;

      if (!technicians || technicians.length === 0) {
        setPerformanceData([]);
        setLoading(false);
        return;
      }

      // Fetch services for all technicians
      const performancePromises = technicians.map(async (tech) => {
        const { data: services, error: serviceError } = await supabase
          .from('app_0a8fd_services')
          .select('status')
          .eq('technician_id', tech.id);

        if (serviceError) {
          console.error(`Error fetching services for ${tech.name}:`, serviceError);
          return {
            technician_id: tech.id,
            technician_name: tech.name,
            assigned_count: 0,
            in_progress_count: 0,
            completed_count: 0,
            total_active: 0
          };
        }

        const assigned = services?.filter(s => s.status === 'Atandı').length || 0;
        const inProgress = services?.filter(s => s.status === 'Devam Ediyor').length || 0;
        const completed = services?.filter(s => s.status === 'Tamamlandı').length || 0;

        return {
          technician_id: tech.id,
          technician_name: tech.name,
          assigned_count: assigned,
          in_progress_count: inProgress,
          completed_count: completed,
          total_active: assigned + inProgress
        };
      });

      const results = await Promise.all(performancePromises);
      
      // Sort by total active tasks (descending)
      results.sort((a, b) => b.total_active - a.total_active);
      
      setPerformanceData(results);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Performans verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return {
      totalTechnicians: performanceData.length,
      totalActive: performanceData.reduce((sum, tech) => sum + tech.total_active, 0),
      totalCompleted: performanceData.reduce((sum, tech) => sum + tech.completed_count, 0)
    };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anasayfa</h1>
          <p className="text-muted-foreground">Teknisyen performans takibi ve genel durum</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Teknisyen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTechnicians}</div>
            <p className="text-xs text-muted-foreground">Aktif teknisyen sayısı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Görevler</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground">Devam eden toplam görev</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <p className="text-xs text-muted-foreground">Toplam tamamlanan görev</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teknisyen Performans Tablosu</CardTitle>
          <CardDescription>
            Teknisyenlerin atanan ve tamamlanan görev sayıları (Gerçek zamanlı güncelleme)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {performanceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz onaylanmış teknisyen bulunmamaktadır.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Teknisyen Adı</TableHead>
                    <TableHead className="text-center">Atandı</TableHead>
                    <TableHead className="text-center">Devam Ediyor</TableHead>
                    <TableHead className="text-center">Aktif Toplam</TableHead>
                    <TableHead className="text-center">Tamamlandı</TableHead>
                    <TableHead className="text-right">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((tech, index) => (
                    <TableRow key={tech.technician_id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-semibold">{tech.technician_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{tech.assigned_count}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">{tech.in_progress_count}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={tech.total_active > 5 ? "destructive" : "outline"}
                          className="font-bold"
                        >
                          {tech.total_active}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="bg-green-500 hover:bg-green-600">
                          {tech.completed_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {tech.total_active === 0 ? (
                          <span className="text-sm text-muted-foreground">Müsait</span>
                        ) : tech.total_active > 5 ? (
                          <span className="text-sm text-destructive font-medium">Yoğun</span>
                        ) : (
                          <span className="text-sm text-primary font-medium">Aktif</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}