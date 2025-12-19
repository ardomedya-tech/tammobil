import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { db, User } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'operator' as 'operator' | 'technician' | 'admin',
    is_approved: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('[Users] Fetching users...');
      const data = await db.getUsers();
      console.log('[Users] Users fetched successfully:', data.length, 'users');
      setUsers(data);
    } catch (error) {
      console.error('[Users] Error fetching users:', error);
      toast.error('Kullanıcılar yüklenirken hata oluştu: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      console.log('[Users] Adding new user:', newUser);
      await db.addUser(newUser);
      toast.success('Kullanıcı başarıyla eklendi');
      setIsAddDialogOpen(false);
      setNewUser({
        email: '',
        full_name: '',
        role: 'operator',
        is_approved: true
      });
      fetchUsers();
    } catch (error) {
      console.error('[Users] Error adding user:', error);
      toast.error('Kullanıcı eklenirken hata oluştu: ' + (error as Error).message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    console.log('[Users] Delete button clicked for user ID:', userId);
    console.log('[Users] Current user ID:', currentUser?.id);
    
    if (userId === currentUser?.id) {
      toast.error('Kendi hesabınızı silemezsiniz');
      return;
    }

    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      console.log('[Users] Delete cancelled by user');
      return;
    }

    try {
      console.log('[Users] Calling db.deleteUser with ID:', userId);
      await db.deleteUser(userId);
      console.log('[Users] User deleted successfully');
      toast.success('Kullanıcı başarıyla silindi');
      fetchUsers();
    } catch (error) {
      console.error('[Users] Error deleting user:', error);
      console.error('[Users] Error details:', JSON.stringify(error, null, 2));
      toast.error('Kullanıcı silinirken hata oluştu: ' + (error as Error).message);
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    console.log('[Users] Toggle approval clicked for user ID:', userId);
    console.log('[Users] Current approval status:', currentStatus);
    console.log('[Users] New approval status will be:', !currentStatus);
    
    try {
      console.log('[Users] Calling db.updateUser with ID:', userId, 'and is_approved:', !currentStatus);
      await db.updateUser(userId, { is_approved: !currentStatus });
      console.log('[Users] User approval status updated successfully');
      toast.success(currentStatus ? 'Kullanıcı onayı kaldırıldı' : 'Kullanıcı onaylandı');
      fetchUsers();
    } catch (error) {
      console.error('[Users] Error updating user approval:', error);
      console.error('[Users] Error details:', JSON.stringify(error, null, 2));
      toast.error('Kullanıcı durumu güncellenirken hata oluştu: ' + (error as Error).message);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: 'bg-red-500',
      technician: 'bg-blue-500',
      operator: 'bg-green-500'
    };
    const roleNames = {
      admin: 'Yönetici',
      technician: 'Teknisyen',
      operator: 'Operatör'
    };
    return (
      <Badge className={roleColors[role as keyof typeof roleColors]}>
        {roleNames[role as keyof typeof roleNames]}
      </Badge>
    );
  };

  if (currentUser?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Yetkisiz Erişim</CardTitle>
              <CardDescription>Bu sayfaya erişim yetkiniz bulunmamaktadır.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kullanıcı Yönetimi</h1>
            <p className="text-muted-foreground">Sistem kullanıcılarını yönetin</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Yeni Kullanıcı Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
                <DialogDescription>
                  Sisteme yeni bir kullanıcı ekleyin. Kullanıcı otomatik olarak onaylanmış durumda olacaktır.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="kullanici@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Ad Soyad</Label>
                  <Input
                    id="full_name"
                    placeholder="Ad Soyad"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={newUser.role} onValueChange={(value: 'operator' | 'technician' | 'admin') => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">Operatör</SelectItem>
                      <SelectItem value="technician">Teknisyen</SelectItem>
                      <SelectItem value="admin">Yönetici</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  İptal
                </Button>
                <Button onClick={handleAddUser}>Kullanıcı Ekle</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kullanıcılar</CardTitle>
            <CardDescription>Toplam {users.length} kullanıcı</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Yükleniyor...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground">Henüz kullanıcı bulunmuyor</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.is_approved ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Onaylı
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <XCircle className="mr-1 h-3 w-3" />
                            Beklemede
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleApproval(user.id, user.is_approved)}
                          >
                            {user.is_approved ? (
                              <>
                                <XCircle className="mr-1 h-3 w-3" />
                                Onayı Kaldır
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Onayla
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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