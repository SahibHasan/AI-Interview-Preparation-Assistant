/**
 * PrepPilot AI - Main Application Router & Shell
 * Final-Year B.Tech Computer Science Project
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { ScrollToTop } from './components/common/ScrollToTop';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResumeAnalyzerPage } from './pages/ResumeAnalyzerPage';
import { InterviewSetupPage } from './pages/InterviewSetupPage';
import { InterviewRoomPage } from './pages/InterviewRoomPage';
import { EvaluationReportPage } from './pages/EvaluationReportPage';
import { LearningPlanPage } from './pages/LearningPlanPage';
import { AnalyticsHistoryPage } from './pages/AnalyticsHistoryPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

export default function App() {
  return (
    <MotionConfig reducedMotion="never">
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
              {/* Public Entry Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Authenticated Application Console Routes */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/resume-job-match" element={<ResumeAnalyzerPage />} />
                <Route path="/interview-setup" element={<InterviewSetupPage />} />
                <Route path="/live-session" element={<InterviewRoomPage />} />
                <Route path="/evaluation-reports" element={<EvaluationReportPage />} />
                <Route path="/learning-plan" element={<LearningPlanPage />} />
                <Route path="/analytics-history" element={<AnalyticsHistoryPage />} />
                <Route path="/profile-settings" element={<ProfileSettingsPage />} />
              </Route>

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
    </MotionConfig>
  );
}
