import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider, useI18n } from "./context/I18nContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import ExamFoldersPage from "./pages/ExamFoldersPage";
import ExamFolderDetailPage from "./pages/ExamFolderDetailPage";
import QuestionListPage from "./pages/QuestionListPage";
import QuestionEditorPage from "./pages/QuestionEditorPage";
import QuestionDetailPage from "./pages/QuestionDetailPage";
import ReviewHallPage from "./pages/ReviewHallPage";
import ReportsPage from "./pages/ReportsPage";
import AdminConsolePage from "./pages/AdminConsolePage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import Breadcrumb from "./components/Breadcrumb";

function MainApp() {
	const { user, loading } = useAuth();
	const { t } = useI18n();

	// Navigation state
	const [currentTab, setCurrentTab] = useState("exam-folders"); // Default to exam folders / certification overview
	const [editingQuestionId, setEditingQuestionId] = useState(null);
	const [detailQuestionId, setDetailQuestionId] = useState(null);
	const [selectedExamId, setSelectedExamId] = useState(null);

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
					<span>{t("loading")}</span>
				</div>
			</div>
		);
	}

	if (!user) {
		return <LoginPage />;
	}

	const handleNavigate = (tab) => {
		setCurrentTab(tab);
		setEditingQuestionId(null);
		setDetailQuestionId(null);
		setSelectedExamId(null);
	};

	const handleEditQuestion = (question) => {
		setEditingQuestionId(question.id);
		setCurrentTab("create-question");
	};

	const handleViewQuestion = (question) => {
		setDetailQuestionId(question.id);
		setCurrentTab("question-detail");
	};

	const handleSelectExam = (exam) => {
		setSelectedExamId(exam.id);
		setCurrentTab("exam-folder-detail");
	};

	const renderContent = () => {
		switch (currentTab) {
			case "exam-folders":
				return <ExamFoldersPage onSelectExam={handleSelectExam} />;

			case "exam-folder-detail":
				return (
					<ExamFolderDetailPage
						examId={selectedExamId}
						onBack={() => handleNavigate("exam-folders")}
						onViewQuestion={handleViewQuestion}
					/>
				);

			case "questions":
				return (
					<QuestionListPage
						onNavigate={handleNavigate}
						onEditQuestion={handleEditQuestion}
						onViewQuestion={handleViewQuestion}
					/>
				);

			case "create-question":
				return (
					<QuestionEditorPage
						questionId={editingQuestionId}
						onCancel={() => handleNavigate("questions")}
						onSaved={() => handleNavigate("questions")}
					/>
				);

			case "question-detail":
				return (
					<QuestionDetailPage
						questionId={detailQuestionId}
						onBack={() => handleNavigate("questions")}
						onEdit={handleEditQuestion}
					/>
				);

			case "reviews":
				return (
					<ReviewHallPage
						onViewQuestion={handleViewQuestion}
						onEditQuestion={handleEditQuestion}
					/>
				);

			case "reports":
				return <ReportsPage />;

			case "admin-console":
				return <AdminConsolePage initialTab="roles" />;

			case "admin-users":
				return <AdminConsolePage initialTab="roles" />;

			case "admin-tags":
				return <AdminConsolePage initialTab="tags" />;

			case "admin-audit":
				return <AdminConsolePage initialTab="audit" />;

			case "profile":
				return <ProfilePage />;

			default:
				return (
					<QuestionListPage
						onNavigate={handleNavigate}
						onEditQuestion={handleEditQuestion}
						onViewQuestion={handleViewQuestion}
					/>
				);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
			<Navbar onNavigate={handleNavigate} currentTab={currentTab} />
			<div className="flex-1 flex max-w-[1280px] w-full mx-auto">
				<Sidebar currentTab={currentTab} onNavigate={handleNavigate} />
				<main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-5xl w-full">
					<Breadcrumb currentTab={currentTab} onNavigate={handleNavigate} />
					{renderContent()}
				</main>
			</div>
		</div>
	);
}

export default function App() {
	return (
		<I18nProvider>
			<ThemeProvider>
				<AuthProvider>
					<MainApp />
				</AuthProvider>
			</ThemeProvider>
		</I18nProvider>
	);
}
