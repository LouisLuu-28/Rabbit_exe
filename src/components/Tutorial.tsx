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
    {
      target: '[data-tutorial="inventory-nav"]',
      content: "Bước 1: Bắt đầu bằng việc quản lý kho nguyên liệu. Click vào đây để xem kho nguyên liệu.",
      placement: "right",
    },
    {
      target: '[data-tutorial="add-ingredient"]',
      content: "Nhấn vào nút này để thêm nguyên liệu mới vào kho.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="ingredient-list"]',
      content: "Đây là danh sách nguyên liệu của bạn. Bạn có thể chỉnh sửa, xóa và theo dõi tồn kho tại đây.",
      placement: "top",
    },
    {
      target: '[data-tutorial="menu-nav"]',
      content: "Bước 2: Tiếp theo, hãy tạo thực đơn. Click vào đây để quản lý thực đơn.",
      placement: "right",
    },
    {
      target: '[data-tutorial="add-menu-item"]',
      content: "Thêm món ăn mới vào thực đơn của bạn tại đây.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="menu-list"]',
      content: "Quản lý các món ăn, giá cả và trạng thái sẵn sàng phục vụ.",
      placement: "top",
    },
    {
      target: '[data-tutorial="orders-nav"]',
      content: "Bước 3: Quản lý đơn hàng. Click vào đây để xem đơn hàng.",
      placement: "right",
    },
    {
      target: '[data-tutorial="add-order"]',
      content: "Tạo đơn hàng mới cho khách hàng tại đây.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="order-list"]',
      content: "Theo dõi và cập nhật trạng thái đơn hàng của khách hàng.",
      placement: "top",
    },
    {
      target: '[data-tutorial="dashboard-nav"]',
      content: "Dashboard hiển thị tổng quan về doanh nghiệp của bạn.",
      placement: "right",
    },
    {
      target: '[data-tutorial="financial-nav"]',
      content: "Báo cáo tài chính giúp bạn theo dõi doanh thu và chi phí.",
      placement: "right",
    },
    {
      target: '[data-tutorial="account-nav"]',
      content: "Quản lý thông tin tài khoản của bạn tại đây.",
      placement: "right",
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

    if (stepIndex === 2 && location.pathname !== "/inventory") {
      navigateWithDelay("/inventory");
    } else if (stepIndex === 5 && location.pathname !== "/menu-planning") {
      navigateWithDelay("/menu-planning");
    } else if (stepIndex === 8 && location.pathname !== "/orders") {
      navigateWithDelay("/orders");
    } else if (stepIndex === 10 && location.pathname !== "/dashboard") {
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
