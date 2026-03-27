import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_DEFINITIONS, type PlanTier } from "@/lib/subscription";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  requiredPlan?: PlanTier;
}

export function AccessDenied({ requiredPlan }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Bạn chưa có quyền truy cập</CardTitle>
          <CardDescription>
            {requiredPlan
              ? `Tính năng này yêu cầu gói ${PLAN_DEFINITIONS[requiredPlan].name}.`
              : "Vui lòng nâng cấp gói để sử dụng tính năng này."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => navigate("/account")}>Nâng cấp gói</Button>
          <Button variant="outline" onClick={() => navigate("/")}>Về trang chủ</Button>
        </CardContent>
      </Card>
    </div>
  );
}
