import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Wrench, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
          table: 'app_74b74e94ab_service_requests'
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
        .from('app_74b74e94ab_users')
        .select('id, full_name')
        .eq('role', 'technician')
        .eq('is_approved', true);

      if (techError) throw techError;

      if (!technicians || technicians.length === 0) {
        setPerformanceData([]);
        setLoading(false);
        return;
      }

      // Fetch services for all technicians
      const performancePromises = technicians.map(async (tech) => {
        const { data: services, error: serviceError } = await supabase
          .from('app_74b74e94ab_service_requests')
          .select('status')
          .eq('sent_by', tech.id);

        if (serviceError) {
          console.error(`Error fetching services for ${tech.full_name}:`, serviceError);
          return {
            technician_id: tech.id,
            technician_name: tech.full_name,
            assigned_count: 0,
            in_progress_count: 0,
            completed_count: 0,
            total_active: 0
          };
        }

        const sent = services?.filter(s => s.status === 'sent').length || 0;
        const inProgress = services?.filter(s => s.status === 'in_progress').length || 0;
        const completed = services?.filter(s => s.status === 'completed').length || 0;

        return {
          technician_id: tech.id,
          technician_name: tech.full_name,
          assigned_count: sent,
          in_progress_count: inProgress,
          completed_count: completed,
          total_active: sent + inProgress
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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Anasayfa</h1>
            <p className="text-muted-foreground">Teknisyen performans takibi ve genel durum</p>
          </div>
          <Button onClick={fetchPerformanceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
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

        {/* Individual Technician Performance Tables */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Teknisyen Performans Tabloları</h2>
          
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {performanceData.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  Henüz onaylanmış teknisyen bulunmamaktadır.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {performanceData.map((tech) => (
                <Card key={tech.technician_id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">
                        {tech.technician_name}
                      </CardTitle>
                      <Badge 
                        variant={tech.total_active === 0 ? "secondary" : tech.total_active > 5 ? "destructive" : "default"}
                        className="text-xs"
                      >
                        {tech.total_active === 0 ? "Müsait" : tech.total_active > 5 ? "Yoğun" : "Aktif"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-8 text-xs">Gönderildi</TableHead>
                          <TableHead className="h-8 text-xs">Devam Ediyor</TableHead>
                          <TableHead className="h-8 text-xs">Aktif Toplam</TableHead>
                          <TableHead className="h-8 text-xs">Tamamlandı</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="py-2">
                            <div className="flex items-center justify-center">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {tech.assigned_count}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center justify-center">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                {tech.in_progress_count}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center justify-center">
                              <Badge 
                                variant={tech.total_active > 5 ? "destructive" : "outline"}
                                className={tech.total_active > 5 ? "" : "bg-orange-50 text-orange-700 border-orange-200 font-bold"}
                              >
                                {tech.total_active}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center justify-center">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {tech.completed_count}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}