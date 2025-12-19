import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'operator' | 'technician' | 'admin'>('operator');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!email || !password || !fullName) {
      setError('Lütfen tüm alanları doldurun');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      setLoading(false);
      return;
    }

    try {
      await signup(email, password, fullName, role);
      setSuccess(true);
      // Clear form
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('operator');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Kayıt başarılı')) {
          setSuccess(true);
          // Clear form
          setEmail('');
          setPassword('');
          setFullName('');
          setRole('operator');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setError(err.message);
        }
      } else {
        setError('Kayıt sırasında bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Kayıt Ol</CardTitle>
          <CardDescription className="text-center">
            Tammobil sistemine yeni hesap oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Kayıt başarılı!</strong>
                <br />
                Hesabınız oluşturuldu. Yönetici onayından sonra giriş yapabilirsiniz.
                <br />
                <span className="text-sm text-green-600">3 saniye içinde giriş sayfasına yönlendirileceksiniz...</span>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Ad Soyad</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Ad Soyad"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@tammobil.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Şifre</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">En az 6 karakter</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={role} onValueChange={(value: 'operator' | 'technician' | 'admin') => setRole(value)}>
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                </Button>
              </form>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Önemli:</strong> Kayıt olduktan sonra hesabınızın yönetici tarafından onaylanması gerekir. Onay beklerken sisteme giriş yapamazsınız.
                </p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Giriş Yap
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}