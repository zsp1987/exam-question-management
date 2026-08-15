import { useState, useEffect } from "react";
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
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";

function MainApp() {
	const { user, loading } = useAuth();
	const { t } = useI18n();

	// Navigation state
	const [currentTab, setCurrentTab] = useState("exam-folders");
	const [editingQuestionId, setEditingQuestionId] = useState(null);
	const [detailQuestionId, setDetailQuestionId] = useState(null);
	const [selectedExamId, setSelectedExamId] = useState(null);
	const [selectedTaskId, setSelectedTaskId] = useState(null);

	// Enforce nav guards: redirect writer/viewer if they land on forbidden tab (direct URL / stale state)
	// Must be above early returns to keep Rules of Hooks stable (hook order must not change between renders).
	useEffect(() => {
		if (!user) return;
		const role = user.role;
		const pw = role === "WRITER" || role === "TEACHER";
		const isPureWriter = pw && role !== "ADMIN" && role !== "REVIEWER";
		const isViewer = role === "VIEWER";
		const writerAllowed = new Set([
			"questions",
			"create-question",
			"question-detail",
			"profile",
			"tasks",
			"task-detail",
		]);
		const viewerAllowed = new Set([
			"exam-folders",
			"exam-folder-detail",
			"questions",
			"question-detail",
			"profile",
		]);
		if (isPureWriter && !writerAllowed.has(currentTab))
			setCurrentTab("questions");
		if (isViewer && !viewerAllowed.has(currentTab))
			setCurrentTab("exam-folders");
	}, [user, currentTab]);

	// Default tab per role from JWT on first load (before user hydration, still gates initial view)
	useEffect(() => {
		if (loading || user) return;
		try {
			const tok = localStorage.getItem("eqms_token");
			if (!tok) return;
			const payload = JSON.parse(atob(tok.split(".")[1]));
			if (
				(payload.role === "WRITER" || payload.role === "TEACHER") &&
				currentTab === "exam-folders"
			) {
				setCurrentTab("questions");
			}
		} catch {}
	}, [loading, user, currentTab]);

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
		// Guard: block writer from exam-library/reports/reviews/admin, viewer from create/reviews/reports/admin
		if (user) {
			const role = user.role;
			const isPw = role === "WRITER" || role === "TEACHER";
			const isV = role === "VIEWER";
			const isAdmin = role === "ADMIN";
			const isRev = role === "REVIEWER" || isAdmin;
			const isPureWriter = isPw && !isRev;
			if (
				isPureWriter &&
				![
					"questions",
					"create-question",
					"question-detail",
					"profile",
				].includes(tab)
			)
				return;
			if (
				isV &&
				![
					"exam-folders",
					"exam-folder-detail",
					"questions",
					"question-detail",
					"profile",
				].includes(tab)
			)
				return;
		}
		setCurrentTab(tab);
		setEditingQuestionId(null);
		setDetailQuestionId(null);
		setSelectedExamId(null);
		setSelectedTaskId(null);
	};

	const handleEditQuestion = (question) => {
		setEditingQuestionId(question.id);
		setCurrentTab("create-question");
	};

	const handleViewQuestion = (question) => {
		setDetailQuestionId(question.id);
		setCurrentTab("question-detail");
	};

	const handleSelectTask = (task) => {
		setSelectedTaskId(task.id);
		setCurrentTab("task-detail");
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

			case "tasks":
				return <TasksPage onViewTask={handleSelectTask} />;

			case "task-detail":
				return <TaskDetailPage taskId={selectedTaskId} onBack={() => handleNavigate("tasks")} onViewQuestion={handleViewQuestion} />;

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
