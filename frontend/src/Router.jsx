import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useSearchParams,
  useParams,
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
       navigate(`/analysis/${item.id}`);
    } else if (item === 'NEW_SESSION') {
       // Force new session
       navigate(`/analysis`);
    } else if (item && typeof item === 'string') {
       // It's a query string (search) -> New session with initial query
       // We'll pass it as state or query param to /analysis
       navigate(`/analysis?q=${encodeURIComponent(item)}`);
    } else {
       // Default new analysis
      navigate("/analysis");
    }
  };

  return <DashboardPage onQuestionSelect={handleQuestionSelect} />;
}

function AnalysisWrapper() {
  const { sessionId } = useParams(); // Get from URL /analysis/:sessionId
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedQuestion = searchParams.get("q") || "";

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };
  
  // We pass sessionId from URL. If undefined, AnalysisPage should handle creation + redirect.
  // Or we can handle creation here? Better in Page or via a redirect effect.
  // Actually, let's let AnalysisPage handle the "no session id" case by creating one and replacing URL.

  return (
    <AnalysisPage
      selectedQuestion={selectedQuestion}
      urlSessionId={sessionId}
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

        {/* Analysis Page - New Chat */}
        <Route path="/analysis" element={<AnalysisWrapper />} />
        
        {/* Analysis Page - Specific Chat */}
        <Route path="/analysis/:sessionId" element={<AnalysisWrapper />} />

        {/* Redirect any unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
