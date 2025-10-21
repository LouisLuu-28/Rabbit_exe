import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";

interface TutorialProps {
  onComplete: () => void;
}

export function Tutorial({ onComplete }: TutorialProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const steps: Step[] = [
    {
      target: "body",
      content: "Chào mừng bạn đến với Rabbit EMS System! Hãy để chúng tôi hướng dẫn bạn qua các tính năng chính.",
      placement: "center",
      disableBeacon: true,
    },
    // Bước 1: Dashboard
    {
      target: '[data-tutorial="dashboard-nav"]',
      content: "Bước 1: Bắt đầu với Dashboard - nơi hiển thị tổng quan về doanh nghiệp của bạn.",
      placement: "right",
    },
    {
      target: '[data-tutorial="dashboard-stats"]',
      content: "Đây là các chỉ số quan trọng: Tổng đơn hàng, Nguyên liệu, Doanh thu và Lợi nhuận.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="dashboard-recent-orders"]',
      content: "Xem các đơn hàng gần đây nhất tại đây.",
      placement: "top",
    },
    {
      target: '[data-tutorial="dashboard-low-stock"]',
      content: "Theo dõi nguyên liệu sắp hết để kịp thời bổ sung.",
      placement: "top",
    },
    // Bước 2: Kho Nguyên Liệu
    {
      target: '[data-tutorial="inventory-nav"]',
      content: "Bước 2: Quản lý kho nguyên liệu. Click vào đây để xem kho.",
      placement: "right",
    },
    {
      target: '[data-tutorial="add-ingredient"]',
      content: "Nhấn vào nút này để thêm nguyên liệu mới vào kho.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="ingredient-list"]',
      content: "Danh sách nguyên liệu cho phép bạn chỉnh sửa, xóa và theo dõi tồn kho. Bạn có thể xem trạng thái hàng tồn kho và giá trị của từng nguyên liệu.",
      placement: "top",
    },
    // Bước 3: Thực Đơn Tuần
    {
      target: '[data-tutorial="menu-nav"]',
      content: "Bước 3: Quản lý thực đơn tuần. Click vào đây để xem các món ăn.",
      placement: "right",
    },
    {
      target: '[data-tutorial="add-menu-item"]',
      content: "Thêm món ăn mới vào thực đơn của bạn tại đây.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="menu-list"]',
      content: "Danh sách món ăn cho phép bạn chỉnh sửa thông tin món, cập nhật giá cả, thay đổi trạng thái còn hàng/hết hàng.",
      placement: "top",
    },
    // Bước 4: Đơn Hàng
    {
      target: '[data-tutorial="orders-nav"]',
      content: "Bước 4: Quản lý đơn hàng. Click vào đây để xem tất cả đơn hàng.",
      placement: "right",
    },
    {
      target: '[data-tutorial="add-order"]',
      content: "Tạo đơn hàng mới cho khách hàng tại đây.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="order-list"]',
      content: "Danh sách đơn hàng cho phép bạn xem chi tiết, cập nhật trạng thái đơn hàng (Chờ xử lý, Đang chuẩn bị, Sẵn sàng, Đã giao).",
      placement: "top",
    },
    // Bước 5: Tài Chính
    {
      target: '[data-tutorial="financial-nav"]',
      content: "Bước 5: Báo cáo tài chính. Click vào đây để xem tình hình tài chính.",
      placement: "right",
    },
    {
      target: '[data-tutorial="financial-stats"]',
      content: "Xem tổng quan về doanh thu, chi phí và lợi nhuận của tháng.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="financial-details"]',
      content: "Chi tiết tài chính theo tuần, tháng hoặc năm để theo dõi xu hướng kinh doanh.",
      placement: "top",
    },
    // Bước 6: Tài Khoản
    {
      target: '[data-tutorial="account-nav"]',
      content: "Bước 6: Quản lý tài khoản. Click vào đây để xem thông tin cá nhân.",
      placement: "right",
    },
    {
      target: '[data-tutorial="account-update"]',
      content: "Cập nhật thông tin cá nhân như họ tên tại đây.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="account-change-password"]',
      content: "Nhấn vào đây để đổi mật khẩu của bạn.",
      placement: "bottom",
    },
    {
      target: "body",
      content: "Hoàn thành! Bạn đã sẵn sàng sử dụng Rabbit EMS System. Chúc bạn quản lý kinh doanh hiệu quả!",
      placement: "center",
    },
  ];

  useEffect(() => {
    // Ensure we start on dashboard
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
    // Start tutorial after ensuring we're on the right page
    const timer = setTimeout(() => setRun(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Navigate based on step with delay to ensure DOM is ready
  useEffect(() => {
    if (!run) return;

    const navigateWithDelay = (path: string) => {
      setTimeout(() => navigate(path), 300);
    };

    // Bước 1: Stay on dashboard (steps 1-4)
    // Bước 2: Navigate to inventory (steps 5-7)
    if (stepIndex === 5 && location.pathname !== "/inventory") {
      navigateWithDelay("/inventory");
    }
    // Bước 3: Navigate to menu planning (steps 8-10)
    else if (stepIndex === 8 && location.pathname !== "/menu-planning") {
      navigateWithDelay("/menu-planning");
    }
    // Bước 4: Navigate to orders (steps 11-13)
    else if (stepIndex === 11 && location.pathname !== "/orders") {
      navigateWithDelay("/orders");
    }
    // Bước 5: Navigate to financial (steps 14-16)
    else if (stepIndex === 14 && location.pathname !== "/financial") {
      navigateWithDelay("/financial");
    }
    // Bước 6: Navigate to account (steps 17-19)
    else if (stepIndex === 17 && location.pathname !== "/account") {
      navigateWithDelay("/account");
    }
    // Navigate back to dashboard at end (step 20)
    else if (stepIndex === 20 && location.pathname !== "/dashboard") {
      navigateWithDelay("/dashboard");
    }
  }, [stepIndex, run, location.pathname, navigate]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type, action, lifecycle } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false);
      onComplete();
      navigate("/dashboard");
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Move to next step
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      disableCloseOnEsc={false}
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 10000,
        },
      }}
      locale={{
        back: "Quay lại",
        close: "Đóng",
        last: "Hoàn thành",
        next: "Tiếp theo",
        skip: "Bỏ qua",
      }}
    />
  );
}
