const API_BASE = "/api";

export function getStoredToken() {
	return localStorage.getItem("eqms_token");
}

export function setStoredToken(token) {
	if (token) {
		localStorage.setItem("eqms_token", token);
	} else {
		localStorage.removeItem("eqms_token");
	}
}

async function request(endpoint, options = {}) {
	const token = getStoredToken();
	const headers = {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...options.headers,
	};

	const response = await fetch(`${API_BASE}${endpoint}`, {
		...options,
		headers,
	});

	if (options.responseType === "text") {
		if (!response.ok) {
			const err = await response.text();
			throw new Error(err || `Request failed: ${response.status}`);
		}
		return response.text();
	}

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.error || `Request failed: ${response.status}`);
	}
	return data;
}

export const api = {
	// Auth
	login: (username, password) =>
		request("/auth/login", {
			method: "POST",
			body: JSON.stringify({ username, password }),
		}),
	switchUser: (userId) =>
		request("/auth/switch-user", {
			method: "POST",
			body: JSON.stringify({ userId }),
		}),
	getDemoUsers: () => request("/auth/demo-users"),
	getMe: () => request("/auth/me"),
	updateProfile: (data) =>
		request("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
	uploadAvatar: (formData) => {
		const token = getStoredToken();
		const headers = token ? { Authorization: `Bearer ${token}` } : {};
		// Don't set Content-Type for FormData — browser sets multipart boundary
		return fetch(`${API_BASE}/auth/avatar`, {
			method: "POST",
			headers,
			body: formData,
		}).then(async (res) => {
			const data = await res.json().catch(() => ({}));
			if (!res.ok)
				throw new Error(data.error || `Upload failed: ${res.status}`);
			return data;
		});
	},

	// Certification Exam Folders
	getExams: (params = {}) => {
		const query = new URLSearchParams();
		Object.entries(params).forEach(([k, v]) => {
			if (v) query.append(k, v);
		});
		return request(`/exams?${query.toString()}`);
	},
	getExam: (id) => request(`/exams/${id}`),
	createExam: (data) =>
		request("/exams", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateExam: (id, data) =>
		request(`/exams/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteExam: (id) =>
		request(`/exams/${id}`, {
			method: "DELETE",
		}),
	addQuestionsToExam: (id, questionIds, domain_section, score_weight) =>
		request(`/exams/${id}/questions`, {
			method: "POST",
			body: JSON.stringify({ questionIds, domain_section, score_weight }),
		}),
	removeQuestionFromExam: (id, questionId) =>
		request(`/exams/${id}/questions/${questionId}`, {
			method: "DELETE",
		}),
	exportExam: (id, format = "markdown") => {
		if (format === "markdown") {
			return request(`/exams/${id}/export?format=markdown`, {
				responseType: "text",
			});
		}
		return request(`/exams/${id}/export?format=json`);
	},

	// Questions
	getQuestions: (params = {}) => {
		const query = new URLSearchParams();
		Object.entries(params).forEach(([k, v]) => {
			if (v !== undefined && v !== null && v !== "") {
				query.append(k, v);
			}
		});
		return request(`/questions?${query.toString()}`);
	},
	getQuestion: (id) => request(`/questions/${id}`),
	createQuestion: (data) =>
		request("/questions", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateQuestion: (id, data) =>
		request(`/questions/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteQuestion: (id) =>
		request(`/questions/${id}`, {
			method: "DELETE",
		}),
	submitForReview: (id, comment) =>
		request(`/questions/${id}/submit-review`, {
			method: "POST",
			body: JSON.stringify({ comment }),
		}),
	getVersions: (id) => request(`/questions/${id}/versions`),
	getVersion: (id, versionId) =>
		request(`/questions/${id}/versions/${versionId}`),
	rollbackVersion: (id, versionId) =>
		request(`/questions/${id}/rollback/${versionId}`, {
			method: "POST",
		}),

	// Reviews
	getPendingReviews: (params = {}) => {
		const query = new URLSearchParams();
		Object.entries(params).forEach(([k, v]) => {
			if (v) query.append(k, v);
		});
		return request(`/reviews/pending?${query.toString()}`);
	},
	submitReviewDecision: (id, action, comment) =>
		request(`/reviews/${id}/decision`, {
			method: "POST",
			body: JSON.stringify({ action, comment }),
		}),
	getReviewRecords: (limit = 20) => request(`/reviews/records?limit=${limit}`),

	// Tags & Subjects
	getTags: () => request("/tags"),
	getSubjects: () => request("/tags/subjects"),
	createTag: (data) =>
		request("/tags", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateTag: (id, data) =>
		request(`/tags/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteTag: (id) =>
		request(`/tags/${id}`, {
			method: "DELETE",
		}),

	// Stats & Reports
	getOverviewStats: () => request("/stats/overview"),
	exportQuestions: (format = "json", params = {}) => {
		const query = new URLSearchParams({ format, ...params });
		if (format === "markdown") {
			return request(`/stats/export?${query.toString()}`, {
				responseType: "text",
			});
		}
		return request(`/stats/export?${query.toString()}`);
	},

	// Admin
	getAdminUsers: () => request("/admin/users"),
	createAdminUser: (data) =>
		request("/admin/users", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateAdminUser: (id, data) =>
		request(`/admin/users/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteAdminUser: (id) =>
		request(`/admin/users/${id}`, {
			method: "DELETE",
		}),
	getAuditLogs: (params = {}) => {
		const query = new URLSearchParams();
		Object.entries(params).forEach(([k, v]) => {
			if (v) query.append(k, v);
		});
		return request(`/admin/audit-logs?${query.toString()}`);
	},
};
