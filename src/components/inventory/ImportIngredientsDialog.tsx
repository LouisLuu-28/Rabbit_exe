import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CATEGORY_CHOICES = [
  { label: "Rau Củ", value: "rau_cu", aliases: ["rau cu", "rau_cu", "rau củ"] },
  { label: "Thịt", value: "thit", aliases: ["thit", "thịt", "thit heo", "thịt heo"] },
  { label: "Cá & Hải Sản", value: "ca", aliases: ["ca", "cá", "hai san", "hải sản"] },
  { label: "Gia Vị", value: "gia_vi", aliases: ["gia vi", "gia_vi", "gia vị"] },
  { label: "Bột", value: "bot", aliases: ["bot", "bột"] },
  { label: "Dầu Ăn", value: "dau", aliases: ["dau", "dầu", "dầu ăn"] },
  { label: "Đồ Khô", value: "do_kho", aliases: ["do kho", "do_kho", "đồ khô"] },
  { label: "Khác", value: "khac", aliases: ["khac", "khác"] }
];

const UNIT_CHOICES = [
  { label: "Kilôgam (kg)", value: "kg", aliases: ["kg", "kilogram", "kilo", "kilôgam"] },
  { label: "Gam (g)", value: "g", aliases: ["g", "gram", "gam"] },
  { label: "Lít (l)", value: "l", aliases: ["l", "lit", "lít"] },
  { label: "Mililít (ml)", value: "ml", aliases: ["ml", "mililiter", "milliliter", "mililít"] },
  { label: "Chai", value: "chai", aliases: ["chai", "bottle"] },
  { label: "Cái", value: "cai", aliases: ["cai", "cái", "unit"] },
  { label: "Gói", value: "goi", aliases: ["goi", "gói"] },
  { label: "Hộp", value: "hop", aliases: ["hop", "hộp", "box"] },
  { label: "Thùng", value: "thung", aliases: ["thung", "thùng", "carton"] }
];

const CATEGORY_LABELS = CATEGORY_CHOICES.map((choice) => choice.label);
const UNIT_LABELS = UNIT_CHOICES.map((choice) => choice.label);
const MAX_TEMPLATE_ROWS = 200;

const buildOptionMap = (choices: { label: string; value: string; aliases?: string[] }[]) => {
  const map: Record<string, string> = {};
  choices.forEach(({ label, value, aliases = [] }) => {
    map[value.toLowerCase()] = value;
    map[label.toLowerCase()] = value;
    aliases.forEach((alias) => {
      map[alias.toLowerCase()] = value;
    });
  });
  return map;
};

const categoryMap = buildOptionMap(CATEGORY_CHOICES);
const unitMap = buildOptionMap(UNIT_CHOICES);

const sanitizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : value ? String(value).trim() : "";

const parseNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeCategory = (category: string): string => {
  const normalized = sanitizeString(category).toLowerCase();
  return categoryMap[normalized] || "khac";
};

const normalizeUnit = (unit?: string): string => {
  const normalized = sanitizeString(unit).toLowerCase();
  return unitMap[normalized] || "kg";
};

const normalizeDateValue = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  const sanitized = sanitizeString(value);
  if (!sanitized) return null;
  const parsed = new Date(sanitized);
  return Number.isNaN(parsed.getTime()) ? sanitized : parsed.toISOString().split("T")[0];
};

const buildListFormula = (options: string[]) => `"${options.join(",")}"`;

const createDataValidation = (range: string, options: string[]) => ({
  sqref: range,
  type: "list" as const,
  allowBlank: true,
  formulas: [buildListFormula(options)]
});

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
        "Mã Nguyên Liệu": "NL0001",
        "Tên Nguyên Liệu": "Thịt Heo",
        "Danh Mục": CATEGORY_CHOICES.find((choice) => choice.value === "thit")?.label ?? "Thịt",
        "Đơn Vị": UNIT_CHOICES.find((choice) => choice.value === "kg")?.label ?? "Kilôgam (kg)",
        "Tồn Kho": 10,
        "Ngưỡng Tối Thiểu": 5,
        "Giá/Đơn Vị": 120000,
        "Ngày Sản Xuất": "2024-01-01",
        "Hạn Sử Dụng": "2024-12-31",
        "Thông Tin NCC": "Công ty ABC"
      },
      {
        "Mã Nguyên Liệu": "NL0002",
        "Tên Nguyên Liệu": "Cà Rốt",
        "Danh Mục": CATEGORY_CHOICES.find((choice) => choice.value === "rau_cu")?.label ?? "Rau Củ",
        "Đơn Vị": UNIT_CHOICES.find((choice) => choice.value === "kg")?.label ?? "Kilôgam (kg)",
        "Tồn Kho": 20,
        "Ngưỡng Tối Thiểu": 10,
        "Giá/Đơn Vị": 15000,
        "Ngày Sản Xuất": "",
        "Hạn Sử Dụng": "",
        "Thông Tin NCC": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws["!dataValidation"] = [
      createDataValidation(`C2:C${MAX_TEMPLATE_ROWS}`, CATEGORY_LABELS),
      createDataValidation(`D2:D${MAX_TEMPLATE_ROWS}`, UNIT_LABELS)
    ];

    const instructions = [
      ["HƯỚNG DẪN NHẬP DỮ LIỆU"],
      [""],
      ["Cột", "Bắt buộc", "Ghi chú"],
      ["Mã Nguyên Liệu", "Có", "Mã duy nhất, tối đa 50 ký tự"],
      ["Tên Nguyên Liệu", "Có", "Tên hiển thị trong kho"],
      ["Danh Mục", "Có", `Chọn từ danh sách: ${CATEGORY_LABELS.join(", ")}`],
      ["Đơn Vị", "Có", `Chọn từ danh sách: ${UNIT_LABELS.join(", ")}`],
      ["Tồn Kho", "Có", "Số lượng hiện có (số)"],
      ["Ngưỡng Tối Thiểu", "Có", "Số lượng cảnh báo (số)"],
      ["Giá/Đơn Vị", "Có", "Giá nhập (số)"],
      ["Ngày Sản Xuất", "Không", "Định dạng YYYY-MM-DD"],
      ["Hạn Sử Dụng", "Không", "Định dạng YYYY-MM-DD"],
      ["Thông Tin NCC", "Không", "Tên nhà cung cấp"],
      [""],
      ["Lưu ý", "", "Không xóa dòng tiêu đề. Các ô Danh Mục và Đơn Vị có danh sách lựa chọn."]
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nguyên Liệu");
    XLSX.utils.book_append_sheet(wb, instructionSheet, "Huong Dan");
    XLSX.writeFile(wb, "mau_nhap_nguyen_lieu.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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
      const workbook = XLSX.read(data, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      let successCount = 0;
      let errorCount = 0;

      for (const [index, row] of (jsonData as Record<string, unknown>[]).entries()) {
        try {
          const code = sanitizeString(row["Mã Nguyên Liệu"]);
          const name = sanitizeString(row["Tên Nguyên Liệu"]);

          if (!code || !name) {
            throw new Error(`Thiếu mã hoặc tên nguyên liệu tại dòng ${index + 2}`);
          }

          const ingredient = {
            user_id: user.id,
            code,
            name,
            category: normalizeCategory((row["Danh Mục"] as string) || "khac"),
            unit: normalizeUnit(row["Đơn Vị"] as string),
            current_stock: parseNumber(row["Tồn Kho"]),
            min_stock: parseNumber(row["Ngưỡng Tối Thiểu"]),
            cost_per_unit: parseNumber(row["Giá/Đơn Vị"]),
            manufacture_date: normalizeDateValue(row["Ngày Sản Xuất"]),
            expiration_date: normalizeDateValue(row["Hạn Sử Dụng"]),
            supplier_info: sanitizeString(row["Thông Tin NCC"]) || null,
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
              File Excel cần có các cột: Mã Nguyên Liệu, Tên Nguyên Liệu, Danh Mục, Đơn Vị, Tồn Kho, Ngưỡng Tối Thiểu, Giá/Đơn Vị
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
