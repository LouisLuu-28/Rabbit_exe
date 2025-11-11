import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportIngredientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportIngredientsDialog = ({ open, onOpenChange, onSuccess }: ImportIngredientsDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        "Tên Nguyên Liệu": "Thịt Heo",
        "Danh Mục": "thit",
        "Đơn Vị": "kg",
        "Tồn Kho": 10,
        "Ngưỡng Tối Thiểu": 5,
        "Giá/Đơn Vị": 120000,
        "Ngày Sản Xuất": "2024-01-01",
        "Hạn Sử Dụng": "2024-12-31",
        "Thông Tin NCC": "Công ty ABC"
      },
      {
        "Tên Nguyên Liệu": "Cà Rót",
        "Danh Mục": "rau_cu",
        "Đơn Vị": "kg",
        "Tồn Kho": 20,
        "Ngưỡng Tối Thiểu": 10,
        "Giá/Đơn Vị": 15000,
        "Ngày Sản Xuất": "",
        "Hạn Sử Dụng": "",
        "Thông Tin NCC": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nguyên Liệu");
    XLSX.writeFile(wb, "mau_nhap_nguyen_lieu.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const categoryMap: Record<string, string> = {
    "rau_cu": "rau_cu",
    "rau củ": "rau_cu",
    "thit": "thit",
    "thịt": "thit",
    "ca": "ca",
    "cá": "ca",
    "hải sản": "ca",
    "gia_vi": "gia_vi",
    "gia vị": "gia_vi",
    "bot": "bot",
    "bột": "bot",
    "dau": "dau",
    "dầu": "dau",
    "dầu ăn": "dau",
    "do_kho": "do_kho",
    "đồ khô": "do_kho",
    "khac": "khac",
    "khác": "khac"
  };

  const normalizeCategory = (category: string): string => {
    const normalized = category.toLowerCase().trim();
    return categoryMap[normalized] || "khac";
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file Excel",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData as any[]) {
        try {
          // Get next code
          const { data: codeData } = await supabase.rpc('generate_ingredient_code', {
            p_user_id: user.id
          });

          const ingredient = {
            user_id: user.id,
            code: codeData,
            name: row["Tên Nguyên Liệu"],
            category: normalizeCategory(row["Danh Mục"] || "khac"),
            unit: row["Đơn Vị"] || "kg",
            current_stock: Number(row["Tồn Kho"]) || 0,
            min_stock: Number(row["Ngưỡng Tối Thiểu"]) || 0,
            cost_per_unit: Number(row["Giá/Đơn Vị"]) || 0,
            manufacture_date: row["Ngày Sản Xuất"] || null,
            expiration_date: row["Hạn Sử Dụng"] || null,
            supplier_info: row["Thông Tin NCC"] || null,
            last_purchase_date: new Date().toISOString().split('T')[0]
          };

          const { error } = await supabase.from("ingredients").insert(ingredient);
          
          if (error) {
            console.error("Error inserting ingredient:", error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error("Error processing row:", err);
          errorCount++;
        }
      }

      toast({
        title: "Hoàn thành",
        description: `Đã nhập ${successCount} nguyên liệu thành công${errorCount > 0 ? `, ${errorCount} lỗi` : ""}`,
      });

      if (successCount > 0) {
        onSuccess();
        onOpenChange(false);
        setFile(null);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Lỗi",
        description: "Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nhập Nguyên Liệu từ Excel</DialogTitle>
          <DialogDescription>
            Tải lên file Excel để nhập hàng loạt nguyên liệu vào kho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              File Excel cần có các cột: Tên Nguyên Liệu, Danh Mục, Đơn Vị, Tồn Kho, Ngưỡng Tối Thiểu, Giá/Đơn Vị
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            className="w-full"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Tải File Mẫu
          </Button>

          <div className="space-y-2">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                File đã chọn: {file.name}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Hủy
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Đang nhập..." : "Nhập Dữ Liệu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
