import { ChevronRight, Home } from "lucide-react";
import { useI18n } from "../context/I18nContext";

const NAV_LABELS = {
  "exam-folders": (t) => t("navExamFolders"),
  tasks: () => "Tasks",
  "task-detail": () => "Detail",
  "exam-folder-detail": () => "Detail",
  questions: (t) => t("navQuestions"),
  "create-question": (t) => t("navCreateQuestion"),
  "question-detail": () => "Detail",
  reviews: (t) => t("navReviews"),
  reports: (t) => t("navReports"),
  "admin-console": (t) => t("adminConsole"),
  "admin-users": (t) => t("navAdminUsers"),
  "admin-tags": (t) => t("navAdminTags"),
  "admin-audit": (t) => t("navAdminAudit"),
  profile: () => "Profile",
};

const PARENT = {
  "exam-folder-detail": "exam-folders",
  "task-detail": "tasks",
  "create-question": "questions",
  "question-detail": "questions",
  "admin-users": "admin-console",
  "admin-tags": "admin-console",
  "admin-audit": "admin-console",
};

function getCrumbs(currentTab){
  const out=[];
  let cur=currentTab;
  while(cur){
    out.unshift(cur);
    cur=PARENT[cur]||null;
  }
  if(!out.length) return ["questions"];
  return out;
}

export default function Breadcrumb({ currentTab, onNavigate, extraLabel }) {
  const { t } = useI18n();
  const crumbs = getCrumbs(currentTab);
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
      <button
        type="button"
        onClick={() => onNavigate("questions")}
        className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition"
        title="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </button>
      {crumbs.map((id, idx) => {
        const isLast = idx === crumbs.length - 1;
        const labelFn = NAV_LABELS[id] || (() => id);
        let label = labelFn(t);
        // append extra for detail pages
        if (isLast && extraLabel) label = extraLabel;
        return (
          <span key={id} className="inline-flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]" title={label}>
                {label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(id)}
                className="hover:text-slate-700 dark:hover:text-slate-200 transition truncate max-w-[140px]"
                title={label}
              >
                {label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
