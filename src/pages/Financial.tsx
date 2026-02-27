import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateRange } from "react-day-picker";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  DollarSign,
  Filter,
  Flame,
  Loader2,
  Plus,
  ReceiptText,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type FinancialPeriod = "week" | "month" | "quarter" | "year" | "custom";
type FinancialType = "revenue" | "expense";
type FinancialSource = "manual" | "order";

interface FinancialEntry {
  id: string;
  record_date: string;
  dateKey: string;
  type: FinancialType;
  amount: number;
  category: string;
  description: string | null;
  source: FinancialSource;
  status?: string | null;
}

interface CategorySlice {
  category: string;
  revenue: number;
  expense: number;
}

interface TrendPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface RecordFilters {
  type: "all" | FinancialType;
  source: "all" | FinancialSource;
  category: "all" | string;
  search: string;
}

interface OrderMetrics {
  count: number;
  averageValue: number;
}

interface RecordFormState {
  type: FinancialType;
  amount: string;
  category: string;
  description: string;
  record_date: string;
}

const periodOptions: { label: string; value: FinancialPeriod }[] = [
  { label: "7 ngày", value: "week" },
  { label: "Tháng này", value: "month" },
  { label: "Quý", value: "quarter" },
  { label: "Năm", value: "year" },
  { label: "Tùy chỉnh", value: "custom" },
];

const categorySuggestions: Record<FinancialType, string[]> = {
  revenue: ["Đơn hàng", "Đầu tư", "Bán lẻ", "Khác"],
  expense: ["Nguyên liệu", "Nhân sự", "Marketing", "Vận hành", "Khác"],
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatCurrency = (value: number) => `${numberFormatter.format(Math.round(value))}₫`;

const getPresetRange = (period: FinancialPeriod): DateRange => {
  const now = new Date();
  switch (period) {
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "quarter":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "month":
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
};

const normalizeDateKey = (value: string) => {
  try {
    return format(parseISO(value), "yyyy-MM-dd");
  } catch (_error) {
    return format(new Date(value), "yyyy-MM-dd");
  }
};

const generateTrendData = (records: FinancialEntry[], range: DateRange): TrendPoint[] => {
  if (!range.from || !range.to) return [];
  const timeline = eachDayOfInterval({ start: range.from, end: range.to });
  const bucket = new Map<string, { revenue: number; expenses: number }>();

  records.forEach((record) => {
    const current = bucket.get(record.dateKey) || { revenue: 0, expenses: 0 };
    if (record.type === "revenue") {
      current.revenue += record.amount;
    } else {
      current.expenses += record.amount;
    }
    bucket.set(record.dateKey, current);
  });

  return timeline.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const data = bucket.get(key) || { revenue: 0, expenses: 0 };
    return {
      date: format(day, "dd/MM"),
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
    };
  });
};

const buildCategoryData = (records: FinancialEntry[]): CategorySlice[] => {
  const categoryMap = new Map<string, CategorySlice>();
  records.forEach((record) => {
    const key = record.category || (record.type === "revenue" ? "Doanh thu khác" : "Chi phí khác");
    const slice = categoryMap.get(key) || { category: key, revenue: 0, expense: 0 };
    if (record.type === "revenue") {
      slice.revenue += record.amount;
    } else {
      slice.expense += record.amount;
    }
    categoryMap.set(key, slice);
  });
  return Array.from(categoryMap.values()).sort((a, b) => b.revenue + b.expense - (a.revenue + a.expense));
};

const createInitialRecordForm = (): RecordFormState => ({
  type: "expense",
  amount: "",
  category: "",
  description: "",
  record_date: format(new Date(), "yyyy-MM-dd"),
});

const Financial = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [initializing, setInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [period, setPeriod] = useState<FinancialPeriod>("month");
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange("month"));
  const [records, setRecords] = useState<FinancialEntry[]>([]);
  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics>({ count: 0, averageValue: 0 });
  const [recordFilters, setRecordFilters] = useState<RecordFilters>({
    type: "all",
    source: "all",
    category: "all",
    search: "",
  });
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordFormState>(() => createInitialRecordForm());
  const [savingRecord, setSavingRecord] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        setInitializing(false);
        return;
      }
      setIsAuthenticated(true);
      setInitializing(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchFinancialData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setIsFetching(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsFetching(false);
      return;
    }

    const fromISO = format(dateRange.from, "yyyy-MM-dd");
    const toISO = format(dateRange.to, "yyyy-MM-dd");

    const [recordsResponse, ordersResponse] = await Promise.all([
      supabase
        .from("financial_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("record_date", fromISO)
        .lte("record_date", toISO)
        .order("record_date", { ascending: false }),
      supabase
        .from("orders")
        .select("id, order_date, total_amount, customer_name, status")
        .eq("user_id", user.id)
        .gte("order_date", fromISO)
        .lte("order_date", toISO)
        .neq("status", "cancelled"),
    ]);

    if (recordsResponse.error || ordersResponse.error) {
      toast({
        title: "Không thể tải dữ liệu",
        description: recordsResponse.error?.message || ordersResponse.error?.message,
        variant: "destructive",
      });
      setIsFetching(false);
      return;
    }

    const manualRecords: FinancialEntry[] = (recordsResponse.data || []).map((record) => {
      const recordDate = record.record_date || new Date().toISOString();
      return {
        id: record.id,
        record_date: recordDate,
        dateKey: normalizeDateKey(recordDate),
        type: record.type,
        amount: Number(record.amount) || 0,
        category: record.category || (record.type === "revenue" ? "Doanh thu khác" : "Chi phí khác"),
        description: record.description,
        source: "manual",
      };
    });

    const orderRecords: FinancialEntry[] = (ordersResponse.data || []).map((order) => {
      const orderDate = order.order_date || new Date().toISOString();
      return {
        id: `order-${order.id}`,
        record_date: orderDate,
        dateKey: normalizeDateKey(orderDate),
        type: "revenue",
        amount: Number(order.total_amount) || 0,
        category: "Đơn hàng",
        description: order.customer_name ? `Khách ${order.customer_name}` : `Đơn #${order.id}`,
        source: "order",
        status: order.status,
      };
    });

    const combined = [...manualRecords, ...orderRecords].sort(
      (a, b) => b.dateKey.localeCompare(a.dateKey) || b.amount - a.amount,
    );

    setRecords(combined);

    const ordersRevenue = orderRecords.reduce((sum, entry) => sum + entry.amount, 0);
    setOrderMetrics({
      count: orderRecords.length,
      averageValue: orderRecords.length ? ordersRevenue / orderRecords.length : 0,
    });

    setIsFetching(false);
  }, [dateRange.from, dateRange.to, toast]);

  useEffect(() => {
    if (!isAuthenticated || !dateRange.from || !dateRange.to) return;
    fetchFinancialData();
  }, [isAuthenticated, dateRange.from, dateRange.to, fetchFinancialData]);

  const totals = useMemo(() => {
    const revenue = records.filter((entry) => entry.type === "revenue").reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = records.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    return { revenue, expenses, profit: revenue - expenses };
  }, [records]);

  const chartData = useMemo(() => generateTrendData(records, dateRange), [records, dateRange]);
  const categoryData = useMemo(() => buildCategoryData(records), [records]);
  const categoriesForFilter = useMemo(() => {
    const set = new Set<string>();
    records.forEach((record) => {
      if (record.category) {
        set.add(record.category);
      }
    });
    return Array.from(set).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (recordFilters.type !== "all" && record.type !== recordFilters.type) return false;
      if (recordFilters.source !== "all" && record.source !== recordFilters.source) return false;
      if (recordFilters.category !== "all" && record.category !== recordFilters.category) return false;
      if (recordFilters.search) {
        const keyword = recordFilters.search.toLowerCase();
        const candidate = `${record.category} ${record.description || ""}`.toLowerCase();
        if (!candidate.includes(keyword)) return false;
      }
      return true;
    });
  }, [records, recordFilters]);

  const visibleRecords = filteredRecords.slice(0, 60);
  const truncated = filteredRecords.length > visibleRecords.length;

  const daysInRange = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return 0;
    return differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
  }, [dateRange]);

  const dailyBurn = daysInRange ? totals.expenses / daysInRange : 0;
  const profitMargin = totals.revenue ? (totals.profit / totals.revenue) * 100 : 0;
  const largestExpense = useMemo(() => {
    return records
      .filter((entry) => entry.type === "expense")
      .sort((a, b) => b.amount - a.amount)[0];
  }, [records]);

  const handlePeriodChange = (value: FinancialPeriod) => {
    setPeriod(value);
    if (value === "custom") return;
    setDateRange(getPresetRange(value));
  };

  const handleCustomRangeChange = (range?: DateRange) => {
    if (!range?.from || !range?.to) return;
    setPeriod("custom");
    setDateRange(range);
  };

  const handleFilterChange = <K extends keyof RecordFilters>(key: K, value: RecordFilters[K]) => {
    setRecordFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setRecordFilters({ type: "all", source: "all", category: "all", search: "" });
  };

  const handleDialogToggle = (open: boolean) => {
    setRecordDialogOpen(open);
    if (!open) {
      setRecordForm(createInitialRecordForm());
    }
  };

  const handleRecordSubmit = async () => {
    if (!recordForm.amount || !recordForm.record_date) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số tiền và ngày ghi nhận",
        variant: "destructive",
      });
      return;
    }

    const amountValue = Number(recordForm.amount);
    if (Number.isNaN(amountValue)) {
      toast({
        title: "Giá trị không hợp lệ",
        description: "Số tiền phải là một con số",
        variant: "destructive",
      });
      return;
    }

    setSavingRecord(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingRecord(false);
      return;
    }

    const { error } = await supabase.from("financial_records").insert({
      user_id: user.id,
      type: recordForm.type,
      amount: amountValue,
      category: recordForm.category || null,
      description: recordForm.description || null,
      record_date: recordForm.record_date,
    });

    if (error) {
      toast({
        title: "Không thể lưu",
        description: error.message,
        variant: "destructive",
      });
      setSavingRecord(false);
      return;
    }

    toast({
      title: "Đã thêm giao dịch",
      description: "Thông tin tài chính mới đã được lưu",
    });

    setSavingRecord(false);
    handleDialogToggle(false);
    fetchFinancialData();
  };

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  const rangeLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
    : "Chọn khoảng ngày";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Báo Cáo Tài Chính</h1>
          <p className="text-muted-foreground">Theo dõi dòng tiền, lợi nhuận và chi phí theo thời gian</p>
          <p className="text-sm text-muted-foreground mt-1">Khoảng thời gian: {rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={period === option.value ? "default" : "outline"}
              onClick={() => handlePeriodChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <CalendarRange className="h-4 w-4" />
                Chọn ngày
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={handleCustomRangeChange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" onClick={fetchFinancialData} disabled={isFetching} className="gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Làm mới
          </Button>
          <Button size="sm" className="gap-2" onClick={() => handleDialogToggle(true)}>
            <Plus className="h-4 w-4" />
            Ghi nhận
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tutorial="financial-stats">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Doanh Thu</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tổng thu trong kỳ đã chọn</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Chi Phí</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.expenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bao gồm mọi khoản chi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Lợi Nhuận</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totals.profit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Biên lợi nhuận {profitMargin ? profitMargin.toFixed(1) : "0.0"}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-100/60 via-blue-50 to-transparent border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Đơn Hàng</CardTitle>
            <ReceiptText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderMetrics.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Giá trị TB: {formatCurrency(orderMetrics.averageValue || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3" data-tutorial="financial-details">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dòng tiền hàng ngày</CardTitle>
            <CardDescription>Doanh thu, chi phí và lợi nhuận trong khoảng thời gian</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Chưa có dữ liệu để hiển thị</div>
            ) : (
              <ChartContainer
                className="h-[320px]"
                config={{
                  revenue: { label: "Doanh thu", color: "hsl(var(--primary))" },
                  expenses: { label: "Chi phí", color: "hsl(var(--destructive))" },
                  profit: { label: "Lợi nhuận", color: "hsl(var(--chart-3))" },
                }}
              >
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={0.25} fill="hsl(var(--primary))" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fillOpacity={0.15} fill="hsl(var(--destructive))" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" fillOpacity={0.1} fill="hsl(var(--chart-3))" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh mục chi tiêu</CardTitle>
            <CardDescription>So sánh doanh thu và chi phí theo nhóm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Chưa có danh mục nào</div>
            ) : (
              <ChartContainer
                className="h-[240px]"
                config={{
                  revenue: { label: "Doanh thu", color: "hsl(var(--primary))" },
                  expense: { label: "Chi phí", color: "hsl(var(--destructive))" },
                }}
              >
                <BarChart data={categoryData.slice(0, 6)} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(value) => `${Math.round(value / 1000)}k`} hide />
                  <YAxis dataKey="category" type="category" width={110} className="text-xs" />
                  <ChartLegend content={<ChartLegendContent />} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} barSize={16} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ChartContainer>
            )}
            <div className="space-y-2">
              {categoryData.slice(0, 3).map((item) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.category}</p>
                    <p className="text-muted-foreground text-xs">Chi phí {formatCurrency(item.expense)}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.revenue > item.expense ? "Sinh lời" : "Tốn kém"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chỉ số nổi bật</CardTitle>
          <CardDescription>Hiệu suất hoạt động trong khoảng thời gian đã chọn</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Burn rate / ngày</span>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">{formatCurrency(dailyBurn)}</p>
              <p className="text-xs text-muted-foreground">{daysInRange} ngày</p>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Biên lợi nhuận</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">{profitMargin.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{totals.profit >= 0 ? "Có lãi" : "Đang lỗ"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Chi phí lớn nhất</span>
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">
                {largestExpense ? formatCurrency(largestExpense.amount) : "--"}
              </p>
              <p className="text-xs text-muted-foreground">
                {largestExpense ? largestExpense.category : "Chưa có dữ liệu"}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Giá trị đơn TB</span>
                <ReceiptText className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">{formatCurrency(orderMetrics.averageValue || 0)}</p>
              <p className="text-xs text-muted-foreground">{orderMetrics.count} đơn hợp lệ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ghi nhận tài chính</CardTitle>
              <CardDescription>Danh sách giao dịch thủ công và doanh thu từ đơn hàng</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDialogToggle(true)}>
              <Plus className="h-4 w-4" />
              Ghi nhận
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Select
              value={recordFilters.type}
              onValueChange={(value) => handleFilterChange("type", value as RecordFilters["type"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="revenue">Doanh thu</SelectItem>
                <SelectItem value="expense">Chi phí</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={recordFilters.source}
              onValueChange={(value) => handleFilterChange("source", value as RecordFilters["source"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nguồn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nguồn</SelectItem>
                <SelectItem value="manual">Ghi nhận thủ công</SelectItem>
                <SelectItem value="order">Đơn hàng</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={recordFilters.category}
              onValueChange={(value) => handleFilterChange("category", value as RecordFilters["category"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categoriesForFilter.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="Tìm theo danh mục hoặc ghi chú"
                value={recordFilters.search}
                onChange={(event) => handleFilterChange("search", event.target.value)}
              />
              <Button size="icon" variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFetching ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Đang tải dữ liệu...
            </div>
          ) : visibleRecords.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Không có giao dịch phù hợp</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Diễn giải</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{format(parseISO(record.dateKey), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={record.type === "revenue" ? "secondary" : "destructive"}
                        className={record.type === "revenue" ? "bg-emerald-100 text-emerald-700" : ""}
                      >
                        {record.type === "revenue" ? "Doanh thu" : "Chi phí"}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.category}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {record.description || "--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {record.source === "order" ? "Đơn hàng" : "Thủ công"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {record.type === "expense" ? "-" : "+"}
                      {formatCurrency(record.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                Đang hiển thị {visibleRecords.length}/{filteredRecords.length} giao dịch
                {truncated ? " (lọc thêm để xem cụ thể hơn)" : ""}
              </TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={recordDialogOpen} onOpenChange={handleDialogToggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận giao dịch</DialogTitle>
            <DialogDescription>Thêm doanh thu hoặc chi phí thủ công để cập nhật báo cáo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Loại giao dịch</Label>
                <Select
                  value={recordForm.type}
                  onValueChange={(value) =>
                    setRecordForm((prev) => ({ ...prev, type: value as FinancialType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Doanh thu</SelectItem>
                    <SelectItem value="expense">Chi phí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngày ghi nhận</Label>
                <Input
                  type="date"
                  value={recordForm.record_date}
                  onChange={(event) => setRecordForm((prev) => ({ ...prev, record_date: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Số tiền (₫)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={recordForm.amount}
                  onChange={(event) => setRecordForm((prev) => ({ ...prev, amount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Input
                  value={recordForm.category}
                  onChange={(event) => setRecordForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="VD: Nguyên liệu"
                />
                <div className="flex flex-wrap gap-2">
                  {categorySuggestions[recordForm.type].map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setRecordForm((prev) => ({ ...prev, category: suggestion }))}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                rows={3}
                placeholder="Thông tin chi tiết..."
                value={recordForm.description}
                onChange={(event) => setRecordForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogToggle(false)}>
              Hủy
            </Button>
            <Button onClick={handleRecordSubmit} disabled={savingRecord} className="gap-2">
              {savingRecord && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu giao dịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financial;
