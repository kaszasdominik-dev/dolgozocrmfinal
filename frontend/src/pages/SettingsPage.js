import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User, Lock, Save, Tags, Plus, Trash2, Loader2, Pencil, GripVertical, Users } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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

  // Categories state
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data);
    } catch (e) {
      toast.error("Hiba a kategóriák betöltésekor");
    } finally {
      setCategoriesLoading(false);
    }
  };

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

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error("Add meg a kategória nevét");
      return;
    }

    setAddingCategory(true);
    try {
      await axios.post(`${API}/categories`, {
        name: newCategoryName.trim(),
        color: newCategoryColor
      });
      toast.success("Kategória létrehozva");
      setNewCategoryName("");
      setNewCategoryColor("#3b82f6");
      fetchCategories();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a kategória létrehozásakor");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Biztosan törlöd a "${name}" kategóriát?`)) return;

    setDeletingId(id);
    try {
      await axios.delete(`${API}/categories/${id}`);
      toast.success("Kategória törölve");
      fetchCategories();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a kategória törlésekor");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditModalOpen(true);
  };

  const handleEditCategory = async () => {
    if (!editName.trim()) {
      toast.error("Add meg a kategória nevét");
      return;
    }

    setEditLoading(true);
    try {
      await axios.put(`${API}/categories/${editingCategory.id}`, {
        name: editName.trim(),
        color: editColor
      });
      toast.success("Kategória frissítve");
      setEditModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a kategória frissítésekor");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update local state immediately for smooth UX
    setCategories(items);
    
    // Send new order to backend
    try {
      const orders = items.map((item, index) => ({
        id: item.id,
        order: index
      }));
      await axios.put(`${API}/categories/reorder`, { orders });
      toast.success("Sorrend mentve");
    } catch (e) {
      toast.error("Hiba a sorrend mentésekor");
      fetchCategories(); // Revert on error
    }
  };

  const colorPresets = [
    "#3b82f6", "#22c55e", "#f97316", "#a855f7", 
    "#64748b", "#f59e0b", "#ef4444", "#06b6d4",
    "#ec4899", "#8b5cf6"
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Beállítások</h1>
        <p className="text-muted-foreground mt-1">Fiók beállítások kezelése</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${user?.role === "admin" ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="profile" data-testid="profile-tab">
            <User className="w-4 h-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password" data-testid="password-tab">
            <Lock className="w-4 h-4 mr-2" />
            Jelszó
          </TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="categories" data-testid="categories-tab">
              <Tags className="w-4 h-4 mr-2" />
              Kategóriák
            </TabsTrigger>
          )}
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

        {user?.role === "admin" && (
          <TabsContent value="categories" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Dolgozó kategóriák kezelése</CardTitle>
                <CardDescription>
                  Kategóriák hozzáadása, szerkesztése és törlése. Húzd a kategóriákat a sorrend változtatásához.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new category form */}
                <form onSubmit={handleAddCategory} className="space-y-4 pb-4 border-b border-border">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Új kategória neve</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="pl. Gyakornok"
                      data-testid="new-category-name-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Szín</Label>
                    <div className="flex flex-wrap gap-2">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategoryColor(color)}
                          className={`w-8 h-8 rounded-full transition-all ${
                            newCategoryColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`color-preset-${color}`}
                        />
                      ))}
                      <Input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="w-8 h-8 p-0 border-0 cursor-pointer"
                        data-testid="custom-color-picker"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="add-category-btn"
                  >
                    {addingCategory ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Hozzáadás...</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" /> Kategória hozzáadása</>
                    )}
                  </Button>
                </form>

                {/* Categories list with drag & drop */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Meglévő kategóriák
                    <span className="text-xs text-muted-foreground font-normal">(húzd a sorrendjük megváltoztatásához)</span>
                  </Label>
                  {categoriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">Nincsenek kategóriák</p>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="categories">
                        {(provided) => (
                          <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {categories.map((cat, index) => (
                              <Draggable key={cat.id} draggableId={cat.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-transparent transition-all ${
                                      snapshot.isDragging ? "shadow-lg border-primary/50 bg-card" : ""
                                    }`}
                                    data-testid={`category-item-${cat.id}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <div 
                                        className="w-4 h-4 rounded-full shrink-0" 
                                        style={{ backgroundColor: cat.color }}
                                      />
                                      <div>
                                        <span className="font-medium text-foreground">{cat.name}</span>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Users className="w-3 h-3" />
                                          <span>{cat.worker_count || 0} dolgozó</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => openEditModal(cat)}
                                        data-testid={`edit-category-${cat.id}`}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                        disabled={deletingId === cat.id || (cat.worker_count || 0) > 0}
                                        title={(cat.worker_count || 0) > 0 ? "Nem törölhető - dolgozók használják" : "Törlés"}
                                        data-testid={`delete-category-${cat.id}`}
                                      >
                                        {deletingId === cat.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Category Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kategória szerkesztése</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Kategória neve</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Kategória neve"
                data-testid="edit-category-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Szín</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      editColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Mégse
            </Button>
            <Button 
              onClick={handleEditCategory} 
              disabled={editLoading || !editName.trim()}
              className="bg-primary"
              data-testid="save-edit-category-btn"
            >
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mentés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
