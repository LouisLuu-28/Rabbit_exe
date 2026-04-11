import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { normalizePlan, type PlanTier } from "@/lib/subscription";
import { useSubscription } from "@/hooks/use-subscription";

type ManagedUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "customer";
  plan: PlanTier;
  canSelfManagePlan: boolean;
  subscriptionExpiresAt: string | null;
  isExpired?: boolean;
  rawPlan?: PlanTier;
  lastSignInAt?: string | null;
  createdAt?: string;
};

type CustomerDetail = ManagedUser & {
  passwordMask: string;
};

type CustomerRpcRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  plan: string;
  raw_plan: string;
  can_self_manage_plan: boolean;
  subscription_expires_at: string | null;
  is_expired: boolean;
  last_sign_in_at: string | null;
  created_at: string | null;
};

const toDatetimeLocalValue = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, isAuthenticated, role } = useSubscription();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [adminApiAvailable, setAdminApiAvailable] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPlan, setNewPlan] = useState<PlanTier>("basic");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  const [editingPlans, setEditingPlans] = useState<Record<string, PlanTier>>({});
  const [editingExpiresAt, setEditingExpiresAt] = useState<Record<string, string>>({});
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) {
      navigate("/account");
    }
  }, [loading, isAuthenticated, role, navigate]);

  const withAdminToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Phiên đăng nhập không hợp lệ");
    }

    return session.access_token;
  };

  const getEdgeFunctionUrl = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    return `${supabaseUrl}/functions/v1/admin-users`;
  };

  const requestAdminApi = async (_path: string, init: RequestInit, token: string) => {
    const url = getEdgeFunctionUrl();
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const rawText = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson && rawText ? JSON.parse(rawText) : null;

    if (!response.ok) {
      const message =
        (data && typeof data === "object" && "error" in data && String((data as any).error)) ||
        (rawText ? rawText.slice(0, 200) : "Không thể xử lý yêu cầu admin");
      throw new Error(message);
    }

    if (!isJson) {
      throw new Error("Admin API không trả về JSON hợp lệ.");
    }

    return data;
  };

  const applyUsersState = (nextUsers: ManagedUser[]) => {
    setUsers(nextUsers);

    const nextPlans: Record<string, PlanTier> = {};
    const nextExpires: Record<string, string> = {};
    const nextNames: Record<string, string> = {};

    nextUsers.forEach((user) => {
      nextPlans[user.id] = user.plan;
      nextExpires[user.id] = toDatetimeLocalValue(user.subscriptionExpiresAt);
      nextNames[user.id] = user.fullName || "";
    });

    setEditingPlans(nextPlans);
    setEditingExpiresAt(nextExpires);
    setEditingNames(nextNames);
  };

  const fetchUsersViaRpcFallback = async () => {
    const { data, error } = await supabase.rpc("admin_list_customers");

    if (error) {
      throw new Error(error.message || "Không thể tải danh sách khách hàng từ Supabase.");
    }

    const mappedUsers = ((data || []) as CustomerRpcRow[]).map((row) => {
      const plan = normalizePlan(row.plan || "unpaid");
      const rawPlan = normalizePlan(row.raw_plan || plan || "unpaid");

      return {
        id: row.id,
        email: row.email || "",
        fullName: row.full_name,
        role: row.role === "admin" ? "admin" : "customer",
        plan,
        rawPlan,
        canSelfManagePlan: Boolean(row.can_self_manage_plan),
        subscriptionExpiresAt: row.subscription_expires_at || null,
        isExpired: Boolean(row.is_expired),
        lastSignInAt: row.last_sign_in_at || null,
        createdAt: row.created_at || undefined,
      } as ManagedUser;
    });

    return mappedUsers;
  };

  const createCustomerViaPublicSignup = async (payload: {
    email: string;
    password: string;
    fullName: string;
    plan: PlanTier;
    expiresAt: string | null;
  }) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Thiếu cấu hình Supabase trên frontend.");
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        data: {
          full_name: payload.fullName || null,
          role: "customer",
          plan: payload.plan,
          can_self_manage_plan: false,
          is_testing_account: false,
          subscription_expires_at: payload.expiresAt,
        },
      }),
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // keep null and throw with generic message below
    }

    if (!response.ok) {
      throw new Error(data?.msg || data?.error || "Không thể tạo tài khoản khách hàng");
    }

    return data;
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);

    try {
      const token = await withAdminToken();
      const data = await requestAdminApi("", { method: "GET" }, token);
      setAdminApiAvailable(true);
      setListError(null);

      const nextUsers = (data.users || []) as ManagedUser[];
      applyUsersState(nextUsers);
    } catch (apiError) {
      // Fallback to RPC
      setAdminApiAvailable(false);
      try {
        const fallbackUsers = await fetchUsersViaRpcFallback();
        setListError(null);
        applyUsersState(fallbackUsers);
      } catch (fallbackError) {
        setUsers([]);
        const message = fallbackError instanceof Error ? fallbackError.message : apiError instanceof Error ? apiError.message : "Không thể tải danh sách user";
        setListError(message);
        toast({ title: "Lỗi", description: message, variant: "destructive" });
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!loading && isAuthenticated && role === "admin") {
      fetchUsers();
    }
  }, [loading, isAuthenticated, role]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast({ title: "Thiếu thông tin", description: "Email và mật khẩu là bắt buộc", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const token = await withAdminToken();
      let usedFallback = false;
      try {
        await requestAdminApi(
          "",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "create",
              email: newEmail,
              password: newPassword,
              fullName: newFullName,
              plan: newPlan,
              expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
            }),
          },
          token,
        );
      } catch (apiError) {
        usedFallback = true;
        await createCustomerViaPublicSignup({
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          plan: newPlan,
          expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
        });
      }

      toast({
        title: "Thành công",
        description: usedFallback
          ? "Đã tạo tài khoản (fallback). Để quản lý danh sách tập trung, hãy dùng môi trường có Admin API."
          : "Đã tạo tài khoản khách hàng",
      });
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewPlan("basic");
      setNewExpiresAt("");
      await fetchUsers();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Tạo tài khoản thất bại",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePlan = async (userId: string) => {
    setUpdatingUserId(userId);

    try {
      const token = await withAdminToken();
      await requestAdminApi(
        "",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "assignPlan",
            userId,
            fullName: editingNames[userId] || null,
            plan: editingPlans[userId],
            expiresAt: editingExpiresAt[userId] ? new Date(editingExpiresAt[userId]).toISOString() : null,
          }),
        },
        token,
      );

      toast({ title: "Thành công", description: "Đã cập nhật gói và thời hạn" });
      await fetchUsers();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Cập nhật gói thất bại",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!adminApiAvailable) {
      toast({
        title: "Chưa thể xoá",
        description: "Môi trường hiện tại không có Admin API để xoá tài khoản.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm("Bạn chắc chắn muốn xoá tài khoản khách hàng này?");
    if (!confirmed) return;

    setDeletingUserId(userId);
    try {
      const token = await withAdminToken();
      await requestAdminApi(
        "",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "delete",
            userId,
          }),
        },
        token,
      );

      toast({ title: "Thành công", description: "Đã xoá tài khoản khách hàng" });
      await fetchUsers();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Xoá tài khoản thất bại",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const openDetail = (user: ManagedUser) => {
    setSelectedCustomer({
      ...user,
      passwordMask: "*******",
    });
    setDetailOpen(true);
  };

  const customerUsers = useMemo(() => users.filter((u) => u.role !== "admin"), [users]);

  if (loading) {
    return <div className="p-6">Đang tải...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Quản Trị Gói Khách Hàng</h1>
        <p className="text-muted-foreground">Admin cấp tài khoản, gói và thời hạn sử dụng cho khách hàng.</p>
        {!adminApiAvailable && (
          <p className="text-sm text-amber-600 mt-2">
            Admin API chưa khả dụng ở môi trường hiện tại. Hệ thống đang đọc danh sách qua Supabase fallback (chỉ xem); để cập nhật/xoá tập trung cần deploy Vercel + SUPABASE_SERVICE_ROLE_KEY.
          </p>
        )}
        {listError && <p className="text-sm text-red-600 mt-2">{listError}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tạo tài khoản khách hàng</CardTitle>
          <CardDescription>Tài khoản tạo tại đây sẽ không được tự thay đổi gói.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateUser}>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="customer@email.com" />
            </div>

            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" />
            </div>

            <div className="space-y-2">
              <Label>Họ tên</Label>
              <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>

            <div className="space-y-2">
              <Label>Gói</Label>
              <Select value={newPlan} onValueChange={(value) => setNewPlan(value as PlanTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Hạn sử dụng</Label>
              <Input type="datetime-local" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={creating}>{creating ? "Đang tạo..." : "Tạo tài khoản"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách khách hàng</CardTitle>
          <CardDescription>{loadingUsers ? "Đang tải..." : `Tổng ${customerUsers.length} tài khoản khách hàng`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Gói</TableHead>
                <TableHead>Hạn dùng</TableHead>
                <TableHead className="w-[320px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Input
                      value={editingNames[user.id] || ""}
                      onChange={(e) => setEditingNames((prev) => ({ ...prev, [user.id]: e.target.value }))}
                      placeholder="Tên khách hàng"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={editingPlans[user.id] || "basic"}
                      onValueChange={(value) =>
                        setEditingPlans((prev) => ({ ...prev, [user.id]: value as PlanTier }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      value={editingExpiresAt[user.id] || ""}
                      onChange={(e) =>
                        setEditingExpiresAt((prev) => ({ ...prev, [user.id]: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDetail(user)}>
                        Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdatePlan(user.id)}
                        disabled={updatingUserId === user.id || deletingUserId === user.id}
                      >
                        {updatingUserId === user.id ? "Đang lưu..." : "Lưu"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deletingUserId === user.id || updatingUserId === user.id}
                      >
                        {deletingUserId === user.id ? "Đang xoá..." : "Xoá"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết khách hàng</DialogTitle>
            <DialogDescription>Thông tin phục vụ hỗ trợ khách hàng và gia hạn gói.</DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Password</p>
                  <p className="font-medium tracking-widest">{selectedCustomer.passwordMask}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Họ tên</p>
                  <p className="font-medium">{selectedCustomer.fullName || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vai trò</p>
                  <p className="font-medium">{selectedCustomer.role}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gói hiện tại</p>
                  <p className="font-medium">{selectedCustomer.plan}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gói gốc</p>
                  <p className="font-medium">{selectedCustomer.rawPlan || selectedCustomer.plan}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hạn dùng</p>
                  <p className="font-medium">{selectedCustomer.subscriptionExpiresAt ? new Date(selectedCustomer.subscriptionExpiresAt).toLocaleString("vi-VN") : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trạng thái</p>
                  <p className="font-medium">{selectedCustomer.isExpired ? "Hết hạn / Unpaid" : "Đang hoạt động"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lần đăng nhập gần nhất</p>
                  <p className="font-medium">{selectedCustomer.lastSignInAt ? new Date(selectedCustomer.lastSignInAt).toLocaleString("vi-VN") : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ngày tạo</p>
                  <p className="font-medium">{selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleString("vi-VN") : "-"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
