import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportMenuItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportMenuItemsDialog = ({ open, onOpenChange, onSuccess }: ImportMenuItemsDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        "Tên Món": "Cơm Gà Xối Mỡ",
        "Mô Tả": "Cơm gà thơm ngon, đậm đà",
        "Danh Mục": "main",
        "Giá": 45000,
        "Còn Hàng": "Có"
      },
      {
        "Tên Món": "Phở Bò",
        "Mô Tả": "Phở bò truyền thống Hà Nội",
        "Danh Mục": "main",
        "Giá": 50000,
        "Còn Hàng": "Có"
      },
      {
        "Tên Món": "Trà Đá",
        "Mô Tả": "Trà đá mát lạnh",
        "Danh Mục": "drink",
        "Giá": 5000,
        "Còn Hàng": "Có"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Món Ăn");
    XLSX.writeFile(wb, "mau_nhap_mon_an.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const categoryMap: Record<string, string> = {
    "main": "main",
    "món chính": "main",
    "mon chinh": "main",
    "side": "side",
    "món phụ": "side",
    "mon phu": "side",
    "drink": "drink",
    "đồ uống": "drink",
    "do uong": "drink",
    "dessert": "dessert",
    "tráng miệng": "dessert",
    "trang mieng": "dessert"
  };

  const normalizeCategory = (category: string): string => {
    const normalized = category.toLowerCase().trim();
    return categoryMap[normalized] || "main";
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
          const { data: codeData } = await supabase.rpc('generate_menu_item_code', {
            p_user_id: user.id
          });

          const isAvailable = row["Còn Hàng"]?.toString().toLowerCase().includes("có") || 
                             row["Còn Hàng"]?.toString().toLowerCase().includes("yes") ||
                             row["Còn Hàng"]?.toString() === "1" ||
                             row["Còn Hàng"] === true;

          const menuItem = {
            user_id: user.id,
            code: codeData,
            name: row["Tên Món"],
            description: row["Mô Tả"] || "",
            category: normalizeCategory(row["Danh Mục"] || "main"),
            price: Number(row["Giá"]) || 0,
            is_available: isAvailable
          };

          const { error } = await supabase.from("menu_items").insert(menuItem);
          
          if (error) {
            console.error("Error inserting menu item:", error);
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
        description: `Đã nhập ${successCount} món ăn thành công${errorCount > 0 ? `, ${errorCount} lỗi` : ""}`,
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
          <DialogTitle>Nhập Món Ăn từ Excel</DialogTitle>
          <DialogDescription>
            Tải lên file Excel để nhập hàng loạt món ăn vào thực đơn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              File Excel cần có các cột: Tên Món, Mô Tả, Danh Mục (main/side/drink/dessert), Giá, Còn Hàng
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
