import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";
import { normalizePlan, PLAN_DEFINITIONS, type PlanTier } from "@/lib/subscription";
import { seedDemoDataForCurrentUser } from "@/lib/demoSeed";
import { getActiveSessionUser } from "@/lib/authSession";
import { useSubscription } from "@/hooks/use-subscription";

const featureLabels: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Đơn hàng",
  menu: "Thực đơn",
  inventory: "Kho nguyên liệu",
  financial: "Tài chính",
  excel: "Import/Export Excel",
};

const Account = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<PlanTier>("unpaid");
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setEmail(session.user.email || "");
        setFullName(session.user.user_metadata.full_name || "");
        setPlan(normalizePlan(session.user.user_metadata?.plan as string | undefined));

        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Thông tin tài khoản đã được cập nhật",
      });
    }
  };

  const handleUpdatePlan = async () => {
    setSavingPlan(true);
    const { user } = await getActiveSessionUser();

    if (!user) {
      setSavingPlan(false);
      toast({
        title: "Lỗi",
        description: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ data: { plan } });

    setSavingPlan(false);

    if (error) {
      // Fallback local-only plan for testing flow when session token refresh has issues.
      localStorage.setItem(`plan_override_${user.id}`, plan);
      await refreshSubscription();

      toast({
        title: "Đã lưu gói (local)",
        description: "Hệ thống tạm lưu gói trên trình duyệt để tiếp tục test. Đăng nhập lại để đồng bộ cloud.",
      });
      return;
    }

    localStorage.removeItem(`plan_override_${user.id}`);
    await refreshSubscription();

    toast({
      title: "Thành công",
      description: "Đã cập nhật gói sử dụng",
    });
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    const { result, error } = await seedDemoDataForCurrentUser(plan);
    setSeedingDemo(false);

    if (error) {
      toast({
        title: "Lỗi tạo dữ liệu demo",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Đã tạo dữ liệu demo",
      description: `Nguyên liệu: ${result?.ingredients || 0}, Món: ${result?.menuItems || 0}, Đơn: ${result?.orders || 0}, Tài chính: ${result?.financialRecords || 0}`,
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tài Khoản</h1>
        <p className="text-muted-foreground">Quản lý thông tin cá nhân của bạn</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
              <User className="h-8 w-8" />
            </div>
            <div>
              <CardTitle>Thông Tin Cá Nhân</CardTitle>
              <CardDescription>Cập nhật thông tin tài khoản của bạn</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email không thể thay đổi
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và Tên</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
              />
            </div>

            <Button type="submit" disabled={loading} data-tutorial="account-update">
              {loading ? "Đang cập nhật..." : "Cập Nhật Thông Tin"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đổi Mật Khẩu</CardTitle>
          <CardDescription>Bạn có thể đổi mật khẩu bằng cách đăng xuất và sử dụng chức năng "Quên mật khẩu"</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/forgot-password")} data-tutorial="account-change-password">
            Đổi Mật Khẩu
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gói Sử Dụng</CardTitle>
          <CardDescription>Chọn gói để giới hạn quyền truy cập tính năng theo mô hình kinh doanh</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Gói hiện tại</Label>
            <Select value={plan} onValueChange={(value) => setPlan(value as PlanTier)}>
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
          </div>

          <div className="text-sm text-muted-foreground rounded-md border p-3">
            {PLAN_DEFINITIONS[plan].description}
          </div>

          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Tính năng khả dụng</p>
            {PLAN_DEFINITIONS[plan].features.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chỉ xem landing page / website mẫu</p>
            ) : (
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                {PLAN_DEFINITIONS[plan].features.map((feature) => (
                  <li key={feature}>{featureLabels[feature] || feature}</li>
                ))}
              </ul>
            )}
          </div>

          <Button onClick={handleUpdatePlan} disabled={savingPlan}>
            {savingPlan ? "Đang cập nhật..." : "Lưu gói"}
          </Button>

          <Button
            variant="outline"
            onClick={handleSeedDemo}
            disabled={seedingDemo || plan === "unpaid"}
            title={plan === "unpaid" ? "Gói Unpaid chỉ được xem dữ liệu mẫu, không tạo thêm dữ liệu." : undefined}
          >
            {seedingDemo ? "Đang tạo dữ liệu demo..." : "Tạo dữ liệu demo theo gói hiện tại"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;
