import { RouterProvider } from "react-router";
import { AppProvider } from "./state";
import { router } from "./routes";

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
