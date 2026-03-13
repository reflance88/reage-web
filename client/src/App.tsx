import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const MyPage = lazy(() => import("./pages/MyPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentFailPage = lazy(() => import("./pages/PaymentFailPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const FindIdPage = lazy(() => import("./pages/FindIdPage"));
const FindPasswordPage = lazy(() => import("./pages/FindPasswordPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

function Home() {
  window.location.replace("/index-main.html");
  return null;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/find-id" component={FindIdPage} />
        <Route path="/find-password" component={FindPasswordPage} />
        <Route path="/mypage" component={MyPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/payment/success" component={PaymentSuccessPage} />
        <Route path="/payment/fail" component={PaymentFailPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/product/:slug" component={ProductPage} />
        <Route path="/auth/callback" component={AuthCallback} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
