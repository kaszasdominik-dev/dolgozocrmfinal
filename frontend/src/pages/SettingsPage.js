import { useState } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Lock, Save } from "lucide-react";

export default function SettingsPage() {
  const { user, fetchUser } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileLoading, setProfileLoading] = useState(false);
  
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await axios.put(`${API}/auth/profile`, { name: profileName });
      toast.success("Profil frissítve");
      fetchUser();
    } catch (e) {
      toast.error("Hiba történt");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwords.new.length < 8) {
      toast.error("Az új jelszó minimum 8 karakter legyen");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("A két jelszó nem egyezik");
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.put(`${API}/auth/password`, {
        current_password: passwords.current,
        new_password: passwords.new
      });
      toast.success("Jelszó megváltoztatva");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Beállítások</h1>
        <p className="text-muted-foreground mt-1">Fiók beállítások kezelése</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" data-testid="profile-tab">
            <User className="w-4 h-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password" data-testid="password-tab">
            <Lock className="w-4 h-4 mr-2" />
            Jelszó
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profil adatok</CardTitle>
              <CardDescription>Név és egyszerű beállítások</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email cím</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Az email cím nem módosítható</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Név</Label>
                  <Input
                    id="name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="A neved"
                    disabled={user?.role !== "admin"}
                    className={user?.role !== "admin" ? "bg-muted" : ""}
                    data-testid="profile-name-input"
                  />
                  {user?.role !== "admin" && (
                    <p className="text-xs text-muted-foreground">A neved módosításához kérd meg az admint</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Szerepkör</Label>
                  <Input
                    value={user?.role === "admin" ? "Adminisztrátor" : "Toborzó"}
                    disabled
                    className="bg-muted"
                  />
                </div>

                {user?.role === "admin" && (
                  <Button 
                    type="submit" 
                    disabled={profileLoading}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="save-profile-btn"
                  >
                    {profileLoading ? "Mentés..." : (
                      <><Save className="w-4 h-4 mr-2" /> Mentés</>
                    )}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Jelszó változtatás</CardTitle>
              <CardDescription>A jelszó minimum 8 karakter legyen</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Jelenlegi jelszó</Label>
                  <Input
                    id="current"
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    required
                    data-testid="current-password-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new">Új jelszó</Label>
                  <Input
                    id="new"
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    required
                    minLength={8}
                    data-testid="new-password-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Új jelszó megerősítése</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    required
                    minLength={8}
                    data-testid="confirm-password-input"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="change-password-btn"
                >
                  {passwordLoading ? "Mentés..." : "Jelszó megváltoztatása"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
