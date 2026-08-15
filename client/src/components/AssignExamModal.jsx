import React, { useState, useEffect } from "react";
import { FolderCheck, X, Check, Plus, FolderPlus } from "lucide-react";
import { api } from "../api/client";
import { useI18n } from "../context/I18nContext";
import MathRenderer from "./MathRenderer";

export default function AssignExamModal({ question, onClose, onSuccess }) {
	const { t, lang } = useI18n();
	const [exams, setExams] = useState([]);
	const [selectedExamId, setSelectedExamId] = useState("");
	const [domainSection, setDomainSection] = useState(
		"Domain 1: Core Architecture & Knowledge",
	);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		async function loadExams() {
			try {
				setLoading(true);
				const res = await api.getExams();
				setExams(res.exams || []);
				if (res.exams && res.exams.length > 0) {
					setSelectedExamId(res.exams[0].id);
				}
			} catch (err) {
				console.error("Failed to load exams:", err);
			} finally {
				setLoading(false);
			}
		}
		loadExams();
	}, []);

	const handleAssign = async (e) => {
		e.preventDefault();
		if (!selectedExamId) return;

		try {
			setSubmitting(true);
			await api.addQuestionsToExam(
				selectedExamId,
				[question.id],
				domainSection,
				1.0,
			);
			alert(
				lang === "en"
					? "Question successfully assigned to exam library!"
					: "已成功归入试题库！",
			);
			if (onSuccess) onSuccess();
			onClose();
		} catch (err) {
			alert(t("error") + ": " + err.message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
			<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
				<div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
					<h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
						<FolderPlus className="w-4 h-4 text-emerald-600" />
						<span>{t("btnAddToExam")}</span>
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
						Target Question:
					</span>
					<p className="font-bold text-slate-800">
						<MathRenderer content={question.title} />
					</p>
				</div>

				{loading ? (
					<div className="py-8 text-center text-xs text-slate-400">
						{t("loading")}
					</div>
				) : exams.length === 0 ? (
					<div className="py-6 text-center text-xs text-slate-400">
						{lang === "en"
							? "No exam library entries available. Please create one first."
							: "暂无试题库条目，请先在“试题库”页面创建。"}
					</div>
				) : (
					<form onSubmit={handleAssign} className="space-y-4 text-xs">
						<div>
							<label className="block font-bold text-slate-700 mb-1">
								{lang === "en" ? "Select Exam Library Entry" : "选择目标试题库"}{" "}
								*
							</label>
							<select
								value={selectedExamId}
								onChange={(e) => setSelectedExamId(e.target.value)}
								className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
							>
								{exams.map((e) => (
									<option key={e.id} value={e.id}>
										[{e.code}] {e.title}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block font-bold text-slate-700 mb-1">
								{lang === "en"
									? "Exam Domain / Module Section"
									: "考纲对应知识模块"}
							</label>
							<input
								type="text"
								value={domainSection}
								onChange={(e) => setDomainSection(e.target.value)}
								placeholder="e.g. Domain 1: Design Resilient Architectures"
								className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
							/>
						</div>

						<div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
							<button
								type="button"
								onClick={onClose}
								className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
							>
								{t("cancel")}
							</button>
							<button
								type="submit"
								disabled={submitting}
								className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
							>
								{submitting ? "Assigning..." : t("confirm")}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
