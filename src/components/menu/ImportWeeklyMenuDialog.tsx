import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, startOfWeek } from "date-fns";

interface ImportWeeklyMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  weekStart: Date;
}

export const ImportWeeklyMenuDialog = ({ open, onOpenChange, onSuccess, weekStart }: ImportWeeklyMenuDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        "Thứ": "Thứ 2",
        "Mã Món": "TD-001",
        "Tên Món": "Cơm Gà Xối Mỡ"
      },
      {
        "Thứ": "Thứ 3",
        "Mã Món": "TD-002",
        "Tên Món": "Phở Bò"
      },
      {
        "Thứ": "Thứ 4",
        "Mã Món": "TD-003",
        "Tên Món": "Bún Chả"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Thực Đơn Tuần");
    XLSX.writeFile(wb, "mau_thuc_don_tuan.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const dayMap: Record<string, number> = {
    "thứ 2": 1,
    "thứ hai": 1,
    "thu 2": 1,
    "thứ 3": 2,
    "thứ ba": 2,
    "thu 3": 2,
    "thứ 4": 3,
    "thứ tư": 3,
    "thu 4": 3,
    "thứ 5": 4,
    "thứ năm": 4,
    "thu 5": 4,
    "thứ 6": 5,
    "thứ sáu": 5,
    "thu 6": 5,
    "thứ 7": 6,
    "thứ bảy": 6,
    "thu 7": 6,
    "chủ nhật": 0,
    "cn": 0
  };

  const normalizeDayOfWeek = (day: string): number => {
    const normalized = day.toLowerCase().trim();
    return dayMap[normalized] ?? -1;
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

      // Delete existing menu for this week
      await supabase
        .from("weekly_menu")
        .delete()
        .eq("user_id", user.id)
        .eq("week_start_date", format(weekStart, "yyyy-MM-dd"));

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData as any[]) {
        try {
          const dayOfWeek = normalizeDayOfWeek(row["Thứ"] || "");
          
          if (dayOfWeek === -1) {
            console.error("Invalid day:", row["Thứ"]);
            errorCount++;
            continue;
          }

          // Find menu item by code or name
          const { data: menuItems } = await supabase
            .from("menu_items")
            .select("id")
            .eq("user_id", user.id)
            .or(`code.eq.${row["Mã Món"]},name.eq.${row["Tên Món"]}`)
            .limit(1);

          if (!menuItems || menuItems.length === 0) {
            console.error("Menu item not found:", row["Mã Món"], row["Tên Món"]);
            errorCount++;
            continue;
          }

          const weeklyMenuItem = {
            user_id: user.id,
            menu_item_id: menuItems[0].id,
            day_of_week: dayOfWeek,
            week_start_date: format(weekStart, "yyyy-MM-dd")
          };

          const { error } = await supabase.from("weekly_menu").insert(weeklyMenuItem);
          
          if (error) {
            console.error("Error inserting weekly menu:", error);
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
          <DialogTitle>Nhập Thực Đơn Tuần từ Excel</DialogTitle>
          <DialogDescription>
            Tải lên file Excel để nhập thực đơn tuần
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              File Excel cần có các cột: Thứ, Mã Món, Tên Món. Món ăn phải đã tồn tại trong hệ thống.
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
