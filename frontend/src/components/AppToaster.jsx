import { Toaster } from "react-hot-toast";

const AppToaster = () => {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      reverseOrder={false}
      toastOptions={{
        duration: 3000,

        style: {
          background: "#ffffff",
          color: "#1f2937",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "16px",
          fontSize: "15px",
          fontWeight: "600",
          boxShadow:
            "0 12px 30px rgba(0,0,0,.18)",
        },

        success: {
          iconTheme: {
            primary: "#16a34a",
            secondary: "#fff",
          },
        },

        error: {
          iconTheme: {
            primary: "#dc2626",
            secondary: "#fff",
          },
        },
      }}
    />
  );
};

export default AppToaster;