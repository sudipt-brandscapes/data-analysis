import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { LandingPage, DashboardPage, AnalysisPage } from "./components/pages";

// Wrapper components to handle navigation
function LandingPageWrapper() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/dashboard");
  };

  return <LandingPage onGetStarted={handleGetStarted} />;
}

function DashboardWrapper() {
  const navigate = useNavigate();

  const handleQuestionSelect = (item) => {
    if (item && typeof item === 'object' && item.id) {
       // It's a session object
       navigate(`/analysis?sessionId=${item.id}`);
    } else if (item && typeof item === 'string') {
       // It's a query string
       navigate(`/analysis?q=${encodeURIComponent(item)}`);
    } else {
       // New analysis
      navigate("/analysis");
    }
  };

  return <DashboardPage onQuestionSelect={handleQuestionSelect} />;
}

function AnalysisWrapper() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedQuestion = searchParams.get("q") || "";
  const sessionId = searchParams.get("sessionId") || null;

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <AnalysisPage
      selectedQuestion={selectedQuestion}
      initialSessionId={sessionId}
      onBackToDashboard={handleBackToDashboard}
    />
  );
}

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - Home */}
        <Route path="/" element={<LandingPageWrapper />} />

        {/* Dashboard with sample questions */}
        <Route path="/dashboard" element={<DashboardWrapper />} />

        {/* Analysis Page */}
        <Route path="/analysis" element={<AnalysisWrapper />} />

        {/* Redirect any unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
