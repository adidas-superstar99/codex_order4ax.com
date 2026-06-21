import { AdminPage } from "./pages/AdminPage";
import { CloudPage } from "./pages/CloudPage";
import { OrderListPage } from "./pages/OrderListPage";
import { OrderPage } from "./pages/OrderPage";

export function App() {
  const path = window.location.pathname;

  if (path.startsWith("/admin")) {
    return <AdminPage />;
  }

  if (path.startsWith("/cloud")) {
    return <CloudPage />;
  }

  if (path.startsWith("/order/")) {
    return <OrderPage batchId={path.replace("/order/", "")} />;
  }

  return <OrderListPage />;
}
