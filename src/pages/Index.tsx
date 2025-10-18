import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChefHat, BarChart3, Package, FileText } from "lucide-react";
import rabbitLogo from "@/assets/rabbit-logo.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: ChefHat,
      title: "Quản Lý Thực Đơn",
      description: "Lập kế hoạch thực đơn tuần một cách dễ dàng",
    },
    {
      icon: BarChart3,
      title: "Theo Dõi Đơn Hàng",
      description: "Quản lý đơn hàng với trạng thái chi tiết",
    },
    {
      icon: Package,
      title: "Kho Nguyên Liệu",
      description: "Kiểm soát tồn kho và danh sách mua hàng",
    },
    {
      icon: FileText,
      title: "Báo Cáo Tài Chính",
      description: "Xem doanh thu, chi phí và lợi nhuận",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={rabbitLogo} alt="Rabbit Logo" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h1 className="font-bold text-xl">Rabbit EMS System</h1>
              <p className="text-xs text-muted-foreground">Quản lý doanh nghiệp</p>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Đăng Nhập
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Hệ Thống Quản Lý Doanh Nghiệp
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Giải pháp đơn giản, chi phí thấp dành cho quán ăn nhỏ và người khởi nghiệp nấu ăn tại nhà
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="shadow-[var(--shadow-hover)]"
            >
              Bắt Đầu Ngay
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Tìm Hiểu Thêm
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card p-6 rounded-lg border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-hover)] transition-shadow"
            >
              <feature.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Rabbit EMS System. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
