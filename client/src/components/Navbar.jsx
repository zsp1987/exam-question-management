import { useState, useRef, useEffect } from "react";
import {
	BookOpenCheck,
	UserCheck,
	Shield,
	ChevronDown,
	Sparkles,
	LogOut,
	CheckCircle2,
	User,
	Globe,
	Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

function getAvatarUrl(user) {
	if (user?.avatar) return user.avatar.startsWith("/") ? user.avatar : `/${user.avatar}`;
	return null;
}

export default function Navbar({ onNavigate }) {
	const { user, demoUsers, switchUser, logout, isAdmin } = useAuth();
	const { lang, toggleLang, t } = useI18n();
	const [showRoleDropdown, setShowRoleDropdown] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);
	const userMenuRef = useRef(null);

	useEffect(() => {
		function onClickOutside(e) {
			if (!showUserMenu) return;
			if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [showUserMenu]);

	const getRoleBadge = (role) => {
		switch (role) {
			case "ADMIN":
				return (
					<span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-md flex items-center gap-1">
						<Shield className="w-3 h-3" /> ADMIN
					</span>
				);
			case "REVIEWER":
				return (
					<span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-md flex items-center gap-1">
						<UserCheck className="w-3 h-3" /> REVIEWER
					</span>
				);
			case "TEACHER":
				return (
					<span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded-md flex items-center gap-1">
						<Sparkles className="w-3 h-3" /> CREATOR
					</span>
				);
			case "VIEWER":
				return (
					<span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-md flex items-center gap-1">
						<User className="w-3 h-3" /> VIEWER
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					{/* Brand Logo & Name */}
					<div
						className="flex items-center gap-3 cursor-pointer select-none group"
						onClick={() => onNavigate("questions")}
					>
						<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition">
							<BookOpenCheck className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-extrabold text-lg text-slate-900 tracking-tight">
									{t("appTitle")}
								</span>
								<span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 font-semibold rounded-full border border-brand-200">
									{lang === "en" ? "Cert Exam Platform" : "认证考试题库"}
								</span>
							</div>
							<p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block">
								{t("appSubtitle")}
							</p>
						</div>
					</div>

					{/* Right Actions: Language Switcher + Fast Role Switcher & User Profile */}
					<div className="flex items-center gap-3">
						{/* Language Switcher Toggle */}
						<button
							type="button"
							onClick={toggleLang}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
							title="Toggle Language / 切换中英文语言"
						>
							<Globe className="w-3.5 h-3.5 text-brand-600" />
							<span>{lang === "en" ? "🇺🇸 English" : "🇨🇳 中文"}</span>
						</button>

						{/* Quick Role Switcher Dropdown — admin only */}
						{isAdmin && (
							<div className="relative">
								<button
									type="button"
									onClick={() => setShowRoleDropdown(!showRoleDropdown)}
									className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-800 text-xs font-medium transition shadow-2xs min-w-0 max-w-[220px]"
									title={user?.name || "User"}
								>
									<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
									<span className="text-slate-500 hidden lg:inline shrink-0">
										{t("roleSwitcher")}
									</span>
									<span className="font-bold text-slate-900 truncate min-w-0 flex-1 text-left">
										{user?.name || "User"}
									</span>
									<span className="shrink-0">{getRoleBadge(user?.role)}</span>
									<ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
								</button>

								{showRoleDropdown && (
									<div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
										<div className="px-3 py-2 border-b border-slate-100">
											<p className="text-xs font-bold text-slate-900">
												{lang === "en"
													? "Instant Role Simulator"
													: "一键切换测试角色"}
											</p>
											<p className="text-[11px] text-slate-500">
												{lang === "en"
													? "Switch profile to test role-based workflows"
													: "点击即刻以不同权限身份体验完整业务流程"}
											</p>
										</div>

										<div className="py-1">
											{demoUsers.map((u) => {
												const isActive = user?.id === u.id;
												return (
													<button
														key={u.id}
														type="button"
														onClick={async () => {
															await switchUser(u.id);
															setShowRoleDropdown(false);
														}}
														className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition ${
															isActive
																? "bg-brand-50/80 text-brand-700 font-semibold"
																: "hover:bg-slate-50 text-slate-700"
														}`}
													>
														<div className="flex items-center gap-2 min-w-0 flex-1">
															<span className="shrink-0">
																{getRoleBadge(u.role)}
															</span>
															<div className="min-w-0 flex-1 text-left">
																<p
																	className="font-medium text-slate-900 truncate"
																	title={u.name}
																>
																	{u.name}
																</p>
																<p className="text-[10px] text-slate-400 font-mono truncate">
																	@{u.username}
																</p>
															</div>
														</div>
														{isActive && (
															<CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
														)}
													</button>
												);
											})}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Avatar — click to open profile menu */}
						<div className="relative" ref={userMenuRef}>
							<button
								type="button"
								onClick={() => setShowUserMenu((v) => !v)}
								className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md hover:ring-2 hover:ring-brand-200 transition shrink-0 bg-slate-100 flex items-center justify-center"
								title={user?.name || "User"}
							>
								{getAvatarUrl(user) ? (
									<img src={getAvatarUrl(user)} alt={user?.name || "avatar"} className="w-full h-full object-cover" />
								) : (
									<span className="text-xs font-extrabold text-slate-600">
										{(user?.name || user?.username || "U").charAt(0).toUpperCase()}
									</span>
								)}
							</button>
							{showUserMenu && (
								<div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
									<div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
										<div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
											{getAvatarUrl(user) ? (
												<img src={getAvatarUrl(user)} alt={user?.name || "avatar"} className="w-full h-full object-cover" />
											) : (
												<span className="text-sm font-extrabold text-slate-600">{(user?.name || "U").charAt(0).toUpperCase()}</span>
											)}
										</div>
										<div className="min-w-0 flex-1 text-left">
											<p className="text-sm font-bold text-slate-900 truncate" title={user?.name}>{user?.name}</p>
											<p className="text-[11px] text-slate-500 font-mono truncate">@{user?.username} · {user?.role}</p>
										</div>
									</div>
									<button
										type="button"
										onClick={() => { setShowUserMenu(false); onNavigate("profile"); }}
										className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
									>
										<Settings className="w-4 h-4 text-slate-500" />
										<span>{lang === "en" ? "Profile Settings" : "个人设置"}</span>
									</button>
									<button
										type="button"
										onClick={() => { setShowUserMenu(false); logout(); }}
										className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
									>
										<LogOut className="w-4 h-4" />
										<span>{t("logout")}</span>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
