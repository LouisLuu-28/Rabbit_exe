import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
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
    // Start tutorial after a short delay
    const timer = setTimeout(() => setRun(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Navigate based on step
  useEffect(() => {
    if (!run) return;

    if (stepIndex === 1 && location.pathname !== "/inventory") {
      // Don't navigate yet, wait for user to click
    } else if (stepIndex === 2 && location.pathname !== "/inventory") {
      navigate("/inventory");
    } else if (stepIndex === 4 && location.pathname !== "/menu-planning") {
      // Don't navigate yet
    } else if (stepIndex === 5 && location.pathname !== "/menu-planning") {
      navigate("/menu-planning");
    } else if (stepIndex === 7 && location.pathname !== "/orders") {
      // Don't navigate yet
    } else if (stepIndex === 8 && location.pathname !== "/orders") {
      navigate("/orders");
    } else if (stepIndex === 10 && location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
  }, [stepIndex, run, location.pathname, navigate]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type, action } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false);
      onComplete();
    } else if (type === "step:after") {
      // Navigate when clicking next on navigation steps
      if (index === 1 && action === "next") {
        navigate("/inventory");
      } else if (index === 4 && action === "next") {
        navigate("/menu-planning");
      } else if (index === 7 && action === "next") {
        navigate("/orders");
      } else if (index === 10 && action === "next") {
        navigate("/dashboard");
      }
      setStepIndex(index + 1);
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
