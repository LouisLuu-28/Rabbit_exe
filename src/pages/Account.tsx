import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

const Account = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setEmail(session.user.email || "");
        setFullName(session.user.user_metadata.full_name || "");
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

            <Button type="submit" disabled={loading}>
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
          <Button variant="outline" onClick={() => navigate("/forgot-password")}>
            Đổi Mật Khẩu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;
