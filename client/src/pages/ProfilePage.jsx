import { useState, useRef } from "react";
import { User, Mail, Shield, Camera, Save, Lock, AtSign } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

function avatarSrc(user) {
  if (user?.avatar) return user.avatar.startsWith("/") ? user.avatar : `/${user.avatar}`;
  return null;
}

export default function ProfilePage() {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const { lang } = useI18n();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErr(lang === "en" ? "Avatar must be ≤2MB (jpg/png/webp)" : "头像需 ≤2MB（jpg/png/webp）");
      return;
    }
    setErr("");
    setMsg("");
    setUploading(true);
    try {
      await uploadAvatar(file);
      setMsg(lang === "en" ? "Avatar updated" : "头像已更新");
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!name.trim() || !email.trim()) {
      setErr(lang === "en" ? "Name and email are required" : "姓名与邮箱必填");
      return;
    }
    if (newPassword && !currentPassword) {
      setErr(lang === "en" ? "Current password is required to set a new password" : "修改密码需输入当前密码");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        ...(newPassword ? { password: newPassword, currentPassword } : {}),
      });
      setMsg(lang === "en" ? "Profile updated" : "个人资料已更新");
      setCurrentPassword("");
      setNewPassword("");
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-600" />
          {lang === "en" ? "Profile Settings" : "个人设置"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {lang === "en"
            ? "Update your name, email, password and avatar. Username and role are managed by admin."
            : "在此更新姓名、邮箱、密码与头像。用户名与角色由管理员管理。"}
        </p>
      </div>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-xl">{err}</div>}
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl">{msg}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center shrink-0">
            {avatarSrc(user) ? (
              <img src={avatarSrc(user)} alt={user?.name || "avatar"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-extrabold text-slate-500">{(user?.name || user?.username || "U").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarPick} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {uploading ? (lang === "en" ? "Uploading…" : "上传中…") : lang === "en" ? "Upload Avatar" : "上传头像"}
            </button>
            <p className="text-[11px] text-slate-500">jpg / png / webp · ≤2MB</p>
          </div>
        </div>

        {/* Readonly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <label className="space-y-1">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <AtSign className="w-3.5 h-3.5" /> Username
            </span>
            <input value={user?.username || ""} disabled className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600" />
          </label>
          <label className="space-y-1">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <Shield className="w-3.5 h-3.5" /> Role
            </span>
            <input value={user?.role || ""} disabled className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600" />
          </label>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700">{lang === "en" ? "Display Name" : "姓名"} *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user?.name || "Your name"}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="space-y-1 block">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <Mail className="w-3.5 h-3.5" /> Email *
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@exam.local"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              {lang === "en" ? "Change Password (optional)" : "修改密码（可选）"}
            </p>
            <label className="space-y-1 block">
              <span className="font-medium text-slate-600">{lang === "en" ? "Current Password" : "当前密码"}</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-medium text-slate-600">{lang === "en" ? "New Password" : "新密码"}</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? (lang === "en" ? "Saving…" : "保存中…") : lang === "en" ? "Save Changes" : "保存修改"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
