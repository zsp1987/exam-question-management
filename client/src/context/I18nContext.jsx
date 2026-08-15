import React, { createContext, useContext, useState, useEffect } from "react";

const I18nContext = createContext(null);

const TRANSLATIONS = {
	en: {
		// App & Header
		appTitle: "EQMS",
		appSubtitle: "Professional Certification Exam Question Management Platform",
		appDesc: "RBAC · Exam Review · Version Control · LaTeX Formulas & Tables",
		roleSwitcher: "Switch Role:",
		currentRole: "Active Profile:",
		language: "Language",
		login: "Log In",
		logout: "Log Out",
		welcomeBack: "Welcome Back",

		// Nav Items
		navExamFolders: "Exam Library",
		navExamFoldersDesc: "Organize approved questions into exam library pools",
		navQuestions: "Question Repository",
		navQuestionsDesc: "Search, multi-filter & interactive question cards",
		navCreateQuestion: "Draft New Question",
		navCreateQuestionDesc: "Rich Text / LaTeX Formulas / Matrix & Tables",
		navReviews: "Exam Review Center",
		navReviewsDesc: "Pending review queue, rubric annotations & verdicts",
		navReports: "Analytics & Export",
		navReportsDesc: "Exam pool metrics, difficulty matrix & paper export",
		navAdminUsers: "Roles",
		navAdminTags: "Tags",
		navAdminAudit: "Audit",
		adminConsole: "Admin",
		coreWorkflow: "Core Exam Lifecycle",

		// Roles
		roleAdmin: "ADMIN (Director)",
		roleReviewer: "REVIEWER (Lead Auditor)",
		roleTeacher: "EXAM CREATOR (SME)",
		roleViewer: "VIEWER (Auditor)",

		// Question Types
		typeSingleChoice: "Single Choice",
		typeMultipleChoice: "Multiple Choice",
		typeEssay: "Scenario / Essay Problem",

		// Statuses
		statusApproved: "Approved",
		statusPendingReview: "Pending Review",
		statusRejected: "Revision Needed",
		statusDraft: "Draft",

		// Difficulties
		difficultyLabel: "Difficulty",
		diff1: "★☆☆☆☆ (1 Star - Fundamental)",
		diff2: "★★☆☆☆ (2 Stars - Intermediate)",
		diff3: "★★★☆☆ (3 Stars - Proficient)",
		diff4: "★★★★☆ (4 Stars - Advanced)",
		diff5: "★★★★★ (5 Stars - Master / Expert)",

		// Search & Filters
		searchPlaceholder:
			"Search by keyword, scenario, formulas, explanation, or domain...",
		searchBtn: "Search",
		allTypes: "All Question Types",
		allStatuses: "All Review Statuses",
		allSubjects: "All Certifications / Subjects",
		allDifficulties: "All Difficulties",
		allTags: "All Tags / Domains",
		sortByUpdated: "Sort by Last Updated",
		sortByCreated: "Sort by Created Date",
		sortByDifficulty: "Sort by Difficulty",
		clearFilters: "Clear Filters",
		totalCount: "Total Items",
		pageInfo: "Page {page} of {totalPages}",
		prevPage: "Previous",
		nextPage: "Next",

		// Question Card & Actions
		version: "Version",
		totalVersions: "{count} versions",
		expandAnswer: "Expand Standard Answer & Explanation",
		collapseAnswer: "Hide Standard Answer & Explanation",
		standardAnswer: "Standard Answer / Key",
		explanation: "Architectural Rationale & Domain Analysis",
		author: "Author",
		updatedAt: "Updated",
		btnDiff: "Version Diff",
		btnSubmitReview: "Submit for Review",
		btnReview: "Review Item",
		btnEdit: "Edit Item",
		btnDetails: "Details",
		btnDelete: "Delete",
		btnAddToExam: "Assign to Exam Folder",

		// Editor
		editorTitle: "Question Title / Summary *",
		editorStem: "Question Scenario & Stem *",
		editorOptions: "Choice Options Configuration",
		editorAddOption: "Add Option",
		editorMarkCorrect: "Correct Option",
		editorChangeSummary: "Version Change Log / Summary",
		editorChangeSummaryPlaceholder:
			"e.g. Added trade-off table and refined LaTeX formula",
		saveDraft: "Save as Draft",
		saveSubmit: "Save & Submit for Review",
		saveNewVersion: "Save as New Version (Draft)",
		saveNewVersionSubmit: "Save as New Version & Submit",
		cancel: "Cancel",

		// Table & Formula Editor
		formulaHelper: "LaTeX & Table Helper",
		hideFormulaHelper: "Hide Helper",
		insertTable: "Insert Table",
		dragTableGrid: "Drag/Hover Grid to Select Table Size",
		tableRows: "Rows",
		tableCols: "Columns",
		genTable: "Generate Table",
		tableAddRow: "+ Row",
		tableDelRow: "- Row",
		tableAddCol: "+ Col",
		tableDelCol: "- Col",
		blockMath: "Block Mode ($$)",
		viewEdit: "Edit",
		viewSplit: "Split",
		viewPreview: "Preview",
		livePreviewHeader: "WYSIWYG Live Rendering (KaTeX + Table)",

		// Exam Folders
		examFoldersTitle: "Exam Library",
		examFoldersSubtitle:
			"Curate, organize, and package approved questions into formal exam bundles",
		btnCreateExam: "New Exam Library Entry",
		examCode: "Exam Code",
		examPassingScore: "Passing Score",
		examDuration: "Duration (Mins)",
		examCategory: "Category",
		examAssignedQuestions: "Assigned Questions",
		examExportMarkdown: "Export Exam Package (.md)",
		examExportJson: "Export Dataset (.json)",
		btnAssignQuestions: "Add Approved Questions",
		emptyExamFolder: "No questions assigned to this exam library entry yet.",

		// Review Hall
		reviewHallTitle: "Exam Quality & Certification Review Hall",
		reviewHallSubtitle:
			"Enforce rigorous certification standards, formula correctness, and scenario validity",
		pendingQueue: "Pending Queue",
		reviewHistory: "Review Audit Stream",
		btnApprove: "Approve & Certify",
		btnReject: "Reject & Request Revision",
		reviewComment: "Reviewer Feedback & Rationale",
		reviewCommentPlaceholder:
			"Enter item evaluation, rationale, or necessary revisions...",

		// Reports
		reportsTitle: "Certification Pool Analytics & Paper Generator",
		reportsSubtitle:
			"Domain distribution, difficulty matrix, passing rate, and export engine",
		totalPoolSize: "Total Certification Pool",
		passingRate: "Approval Rate",
		typeComposition: "Question Type Composition",
		difficultyDistribution: "Difficulty Gradient Matrix",
		subjectCoverage: "Certification Domain Coverage",
		paperGenerator: "Exam Paper Assembly & Export",
		downloadMdPaper: "Download Markdown Exam",
		downloadJsonData: "Download JSON Dataset",
		printPaper: "Print / PDF Preview",

		// Common
		loading: "Loading...",
		noData: "No matching items found.",
		success: "Operation Successful",
		error: "Error",
		confirm: "Confirm",
		close: "Close",
	},
	zh: {
		// App & Header
		appTitle: "EQMS",
		appSubtitle: "专业认证考试考题全生命周期管理平台",
		appDesc: "权限管理 · 考题审核 · 版本控制 · LaTeX公式与表格排版",
		roleSwitcher: "身份切换:",
		currentRole: "当前角色:",
		language: "语言",
		login: "登录",
		logout: "退出登录",
		welcomeBack: "欢迎回来",

		// Nav Items
		navExamFolders: "试题库",
		navExamFoldersDesc: "将已审核考题归入考试库",
		navQuestions: "题库检索大厅",
		navQuestionsDesc: "多维查询、复合筛选与考题卡片大盘",
		navCreateQuestion: "录入新考题",
		navCreateQuestionDesc: "富文本 / 复杂LaTeX公式 / 表格排版",
		navReviews: "考题审核专区",
		navReviewsDesc: "待审队列、评审批注与通过/驳回流转",
		navReports: "统计报表与导出",
		navReportsDesc: "题库大盘分析与认证试卷组装导出",
		navAdminUsers: "角色管理",
		navAdminTags: "标签管理",
		navAdminAudit: "审计日志",
		adminConsole: "管理",
		coreWorkflow: "题库核心工作流",

		// Roles
		roleAdmin: "ADMIN 超级管理员",
		roleReviewer: "REVIEWER 审核专家",
		roleTeacher: "EXAM CREATOR 命题专家",
		roleViewer: "VIEWER 审计员",

		// Question Types
		typeSingleChoice: "单选题",
		typeMultipleChoice: "多选题",
		typeEssay: "场景综合 / 问答题",

		// Statuses
		statusApproved: "已通过入库",
		statusPendingReview: "待审核",
		statusRejected: "已驳回修改",
		statusDraft: "草稿",

		// Difficulties
		difficultyLabel: "难度梯度",
		diff1: "★☆☆☆☆ (1星 - 基础)",
		diff2: "★★☆☆☆ (2星 - 初级)",
		diff3: "★★★☆☆ (3星 - 中级熟练)",
		diff4: "★★★★☆ (4星 - 高级专家)",
		diff5: "★★★★★ (5星 - 架构大师/压轴)",

		// Search & Filters
		searchPlaceholder:
			"输入关键词全文检索（考题标题、题干场景、公式、选项、解析）...",
		searchBtn: "检索题库",
		allTypes: "全部题型",
		allStatuses: "全部审核状态",
		allSubjects: "全部认证科目",
		allDifficulties: "全部难度",
		allTags: "全部考点标签",
		sortByUpdated: "按更新时间降序",
		sortByCreated: "按创建时间降序",
		sortByDifficulty: "按难度排序",
		clearFilters: "清空筛选",
		totalCount: "总题量",
		pageInfo: "第 {page} / {totalPages} 页",
		prevPage: "上一页",
		nextPage: "下一页",

		// Question Card & Actions
		version: "版本",
		totalVersions: "共 {count} 个版本",
		expandAnswer: "展开标准答案与考点解析",
		collapseAnswer: "收起标准答案与考点解析",
		standardAnswer: "参考答案 / 采分点",
		explanation: "命题思路与考纲考点剖析",
		author: "出题人",
		updatedAt: "更新时间",
		btnDiff: "版本 Diff 对比",
		btnSubmitReview: "送审",
		btnReview: "开始审核",
		btnEdit: "编辑修改",
		btnDetails: "查看详情",
		btnDelete: "删除考题",
		btnAddToExam: "归入试题库",

		// Editor
		editorTitle: "考题标题 / 摘要 (Title) *",
		editorStem: "考题场景与题干内容 (Stem) *",
		editorOptions: "选项配置与判定",
		editorAddOption: "添加选项",
		editorMarkCorrect: "设为正确项",
		editorChangeSummary: "版本变更日志 / 理由",
		editorChangeSummaryPlaceholder: "例如: 完善架构对比表格并修正 LaTeX 公式",
		saveDraft: "保存为草稿",
		saveSubmit: "保存并提交审核",
		saveNewVersion: "保存为新版本 (草稿)",
		saveNewVersionSubmit: "保存新版本并直接送审",
		cancel: "取消",

		// Table & Formula Editor
		formulaHelper: "LaTeX与表格排版助手",
		hideFormulaHelper: "收起助手",
		insertTable: "插入表格",
		dragTableGrid: "矩阵拖拽选定行列尺寸",
		tableRows: "行数",
		tableCols: "列数",
		genTable: "确认生成表格",
		tableAddRow: "+ 行",
		tableDelRow: "- 行",
		tableAddCol: "+ 列",
		tableDelCol: "- 列",
		blockMath: "独立段落居中 ($$)",
		viewEdit: "纯编辑",
		viewSplit: "实时分屏",
		viewPreview: "纯预览",
		livePreviewHeader: "所见即所得渲染 (KaTeX + Table)",

		// Exam Folders
		examFoldersTitle: "试题库",
		examFoldersSubtitle: "将已审核通过的考题按考纲结构归入试题库",
		btnCreateExam: "新建试题库条目",
		examCode: "认证代号",
		examPassingScore: "及格分数线",
		examDuration: "考试时长 (分钟)",
		examCategory: "所属领域",
		examAssignedQuestions: "已收录考题",
		examExportMarkdown: "导出试卷包 (.md)",
		examExportJson: "导出数据集 (.json)",
		btnAssignQuestions: "添加已审核考题",
		emptyExamFolder: "当前试题库尚未收录考题。",

		// Review Hall
		reviewHallTitle: "认证考题教研评审大厅",
		reviewHallSubtitle:
			"严格把关认证考题质量、场景真实性、公式严谨性与排版规范",
		pendingQueue: "待审队列",
		reviewHistory: "评审流转记录",
		btnApprove: "审核通过入库",
		btnReject: "驳回修改",
		reviewComment: "评审意见与修改要求",
		reviewCommentPlaceholder:
			"请输入针对本考题的专业评审意见、采分建议或修改要求...",

		// Reports
		reportsTitle: "题库大盘统计与认证试卷组装导出",
		reportsSubtitle: "考纲覆盖率、题型构成、难度矩阵与自动化试卷生成引擎",
		totalPoolSize: "题库总题量",
		passingRate: "审核通过率",
		typeComposition: "题型构成占比",
		difficultyDistribution: "难度梯度分布",
		subjectCoverage: "认证科目覆盖度",
		paperGenerator: "试卷组装与导出引擎",
		downloadMdPaper: "下载 Markdown 试卷",
		downloadJsonData: "下载 JSON 题库包",
		printPaper: "打印试卷预览",

		// Common
		loading: "加载中...",
		noData: "未找到符合条件的数据",
		success: "操作成功",
		error: "错误",
		confirm: "确认",
		close: "关闭",
	},
};

export function I18nProvider({ children }) {
	// Default to English as requested
	const [lang, setLang] = useState(() => {
		return localStorage.getItem("eqms_lang") || "en";
	});

	useEffect(() => {
		localStorage.setItem("eqms_lang", lang);
		document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
	}, [lang]);

	const toggleLang = () => {
		setLang((prev) => (prev === "en" ? "zh" : "en"));
	};

	const t = (key, params = {}) => {
		const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
		let text = dict[key] || TRANSLATIONS.en[key] || key;
		Object.entries(params).forEach(([k, v]) => {
			text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
		});
		return text;
	};

	return (
		<I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
			{children}
		</I18nContext.Provider>
	);
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		throw new Error("useI18n must be used within an I18nProvider");
	}
	return ctx;
}
