import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Lock, Mail, Moon, Sun } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate("/workers");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      {/* Theme toggle button */}
      <button 
        className="absolute top-4 right-4 p-2 rounded-lg bg-card hover:bg-muted border border-border transition-colors"
        onClick={toggleTheme}
        data-testid="login-theme-toggle"
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border bg-card/80 backdrop-blur-sm" data-testid="login-card">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Dolgozó CRM</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">Jelentkezz be a folytatáshoz</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email cím</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="pelda@email.hu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Jelszó</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-primary/25 transition-all duration-200"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Bejelentkezés...
                </span>
              ) : "Bejelentkezés"}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Teszt belépés: admin@dolgozocrm.hu / admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}