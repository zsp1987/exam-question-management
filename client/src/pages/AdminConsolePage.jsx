import { useState, useEffect } from "react";
import { Shield, Users, Tags, History } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import AdminUsersPage from "./AdminUsersPage";
import AdminTagsPage from "./AdminTagsPage";
import AuditLogsPage from "./AuditLogsPage";

const TABS = [
  { id: "roles", labelEn: "Roles", labelZh: "角色", icon: Users, i18nKey: "navAdminUsers" },
  { id: "tags", labelEn: "Tags", labelZh: "标签", icon: Tags, i18nKey: "navAdminTags" },
  { id: "audit", labelEn: "Audit", labelZh: "审计", icon: History, i18nKey: "navAdminAudit" },
];

export default function AdminConsolePage({ initialTab = "roles" }) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const cur = TABS.find(x => x.id === tab) || TABS[0];
  const title = cur ? (lang === "en" ? cur.labelEn : cur.labelZh) : cur.labelEn;

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-extrabold text-slate-900">{t("adminConsole")}</h1>
          <span className="text-xs text-slate-400 font-mono">· {title}</span>
        </div>
        <div className="mt-4 flex items-center gap-2 border-b border-slate-200 -mx-1 px-1 overflow-x-auto">
          {TABS.map(item => {
            const Icon = item.icon;
            const active = tab === item.id;
            const label = t(item.i18nKey) || (lang === "en" ? item.labelEn : item.labelZh);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition ${active ? "border-purple-600 text-purple-700 bg-purple-50/60 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
                aria-selected={active}
                role="tab"
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel">
        {tab === "roles" && <AdminUsersPage />}
        {tab === "tags" && <AdminTagsPage />}
        {tab === "audit" && <AuditLogsPage />}
      </div>
    </div>
  );
}
