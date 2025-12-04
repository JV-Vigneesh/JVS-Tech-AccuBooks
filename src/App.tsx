import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CompanyProvider } from "@/contexts/CompanyContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import InvoiceForm from "./pages/InvoiceForm";
import InvoiceView from "./pages/InvoiceView";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Vouchers from "./pages/Vouchers";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <CompanyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceForm />} />
                <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
                <Route path="/invoices/view/:id" element={<InvoiceView />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/vouchers" element={<Vouchers />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;