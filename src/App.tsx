import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import InvoiceForm from "./pages/InvoiceForm";
import InvoiceView from "./pages/InvoiceView";
import Quotations from "./pages/Quotations";
import QuotationForm from "./pages/QuotationForm";
import QuotationView from "./pages/QuotationView";
import DeliveryChallans from "./pages/DeliveryChallans";
import ChallanForm from "./pages/ChallanForm";
import ChallanView from "./pages/ChallanView";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Vouchers from "./pages/Vouchers";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Pick router type based on environment
const Router = process.env.NODE_ENV === "development" ? BrowserRouter : HashRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DatabaseProvider>
        <CompanyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/invoices/new" element={<InvoiceForm />} />
                  <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
                  <Route path="/invoices/view/:id" element={<InvoiceView />} />
                  <Route path="/quotations" element={<Quotations />} />
                  <Route path="/quotations/new" element={<QuotationForm />} />
                  <Route path="/quotations/edit/:id" element={<QuotationForm />} />
                  <Route path="/quotations/view/:id" element={<QuotationView />} />
                  <Route path="/challans" element={<DeliveryChallans />} />
                  <Route path="/challans/new" element={<ChallanForm />} />
                  <Route path="/challans/edit/:id" element={<ChallanForm />} />
                  <Route path="/challans/view/:id" element={<ChallanView />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/vouchers" element={<Vouchers />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </Router>
          </TooltipProvider>
        </CompanyProvider>
      </DatabaseProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
