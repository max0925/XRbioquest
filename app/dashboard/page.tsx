"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Plus, FolderOpen, Clock, MoreVertical, Globe, Lock, Loader2, Trash2, AlertTriangle, Edit3, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  thumbnail_url: string | null;
  updated_at: string;
  status: "draft" | "published";
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ProjectCard({
  project,
  index,
  onDelete,
  onRename,
  onDuplicate
}: {
  project: Project;
  index: number;
  onDelete: (id: string, name: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300 ${
        menuOpen ? 'z-10' : 'z-0'
      }`}
    >
      {/* Thumbnail */}
      <Link href={`/environment-design?id=${project.id}`} className="block">
        <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
          {project.thumbnail_url ? (
            <img
              src={project.thumbnail_url}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Decorative placeholder pattern */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                    />
                  </svg>
                </div>
                {/* Subtle hexagon pattern */}
                <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-emerald-50 opacity-60" />
                <div className="absolute -bottom-2 -left-3 w-6 h-6 rounded-full bg-emerald-50 opacity-40" />
              </div>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/5 transition-colors duration-300" />
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/environment-design?id=${project.id}`}>
              <h3
                className="text-base font-semibold text-gray-900 truncate hover:text-emerald-600 transition-colors"
                style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
              >
                {project.name}
              </h3>
            </Link>
            <div className="flex items-center gap-3 mt-1.5">
              <span
                className="text-sm text-gray-500 flex items-center gap-1.5"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                <Clock className="w-3.5 h-3.5" />
                {formatRelativeTime(project.updated_at)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  project.status === "published"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {project.status === "published" ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {project.status === "published" ? "Published" : "Draft"}
              </span>
            </div>
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
                >
                  <Link
                    href={`/environment-design?id=${project.id}`}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(project.id, project.name);
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Rename
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(project.id);
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(project.id, project.name);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20"
    >
      {/* Decorative illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
          <FolderOpen className="w-14 h-14 text-emerald-400" strokeWidth={1.5} />
        </div>
        {/* Floating elements */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-emerald-200/50 flex items-center justify-center"
        >
          <Plus className="w-5 h-5 text-emerald-600" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-2 -left-4 w-8 h-8 rounded-lg bg-emerald-100/80"
        />
      </div>

      <h2
        className="text-2xl font-semibold text-gray-900 mb-2"
        style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
      >
        No projects yet
      </h2>
      <p
        className="text-gray-500 text-center max-w-sm mb-8"
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        Create your first VR biology classroom and bring science to life in immersive 3D.
      </p>

      <button
        onClick={onCreate}
        disabled={creating}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        {creating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            Create Your First VR Experience
          </>
        )}
      </button>
    </motion.div>
  );
}

// Rename modal
function RenameModal({
  projectId,
  currentName,
  onConfirm,
  onCancel,
  isRenaming
}: {
  projectId: string;
  currentName: string;
  onConfirm: (id: string, newName: string) => void;
  onCancel: () => void;
  isRenaming: boolean;
}) {
  const [newName, setNewName] = useState(currentName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== currentName) {
      onConfirm(projectId, newName.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-lg font-semibold text-gray-900 mb-4"
          style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
        >
          Rename Project
        </h3>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            autoFocus
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-6"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            disabled={isRenaming}
          />

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isRenaming}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRenaming || !newName.trim() || newName === currentName}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Delete confirmation modal
function DeleteModal({
  projectName,
  onConfirm,
  onCancel,
  isDeleting
}: {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            Delete Project
          </h3>
        </div>

        <p
          className="text-gray-600 mb-6"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Are you sure you want to delete <strong>"{projectName}"</strong>? This action cannot be undone.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const supabase = createClient();

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('[DASHBOARD] Auth check:', {
        user: user ? { id: user.id, email: user.email } : null,
        authError
      });

      if (authError) {
        console.error('[DASHBOARD] Auth error:', authError);
        throw new Error('Authentication failed');
      }

      if (!user) {
        console.warn('[DASHBOARD] No authenticated user');
        setProjects([]);
        setLoading(false);
        return;
      }

      // Fetch projects
      console.log('[DASHBOARD] Fetching projects for user:', user.id);
      const { data, error } = await supabase
        .from("user_projects")
        .select("id, name, thumbnail_url, updated_at, status")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      console.log('[DASHBOARD] Query result:', {
        data,
        error,
        count: data?.length || 0
      });

      if (error) {
        console.error('[DASHBOARD] Supabase query error:', error);
        throw error;
      }

      setProjects(data || []);
    } catch (err: any) {
      console.error("[DASHBOARD] Error fetching projects:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      console.log('[DASHBOARD] Creating project for user:', user?.id);

      if (!user) {
        console.warn('[DASHBOARD] No user, redirecting to login');
        router.push("/login?redirect=/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("user_projects")
        .insert({
          user_id: user.id,
          name: "Untitled Project",
          scene_data: {},
          status: "draft"
        })
        .select("id")
        .single();

      console.log('[DASHBOARD] Create project result:', { data, error });

      if (error) {
        console.error('[DASHBOARD] Create project error:', error);
        throw error;
      }

      // Redirect to editor with new project ID
      console.log('[DASHBOARD] Redirecting to editor with project:', data.id);
      router.push(`/environment-design?id=${data.id}`);
    } catch (err: any) {
      console.error("[DASHBOARD] Error creating project:", err);
      setError(err.message || "Failed to create project");
      setCreating(false);
    }
  }

  async function deleteProject(id: string) {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Remove from local state
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteModal(null);
    } catch (err: any) {
      console.error("Error deleting project:", err);
      setError("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  }

  async function renameProject(id: string, newName: string) {
    setIsRenaming(true);
    try {
      const response = await fetch('/api/projects/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename project');
      }

      // Update local state
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
      );
      setRenameModal(null);
    } catch (err: any) {
      console.error("Error renaming project:", err);
      setError(err.message || "Failed to rename project");
    } finally {
      setIsRenaming(false);
    }
  }

  async function duplicateProject(id: string) {
    setIsDuplicating(id);
    try {
      const response = await fetch('/api/projects/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate project');
      }

      const data = await response.json();

      // Refresh projects list
      await fetchProjects();
    } catch (err: any) {
      console.error("Error duplicating project:", err);
      setError(err.message || "Failed to duplicate project");
    } finally {
      setIsDuplicating(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Error toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"
              >
                <p className="text-sm text-red-700" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  &times;
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h1
                className="text-3xl font-semibold text-gray-900"
                style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
              >
                My Projects
              </h1>
              <p
                className="text-gray-500 mt-1"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {loading
                  ? "Loading..."
                  : projects.length > 0
                  ? `${projects.length} project${projects.length !== 1 ? "s" : ""}`
                  : "Your VR classrooms will appear here"}
              </p>
            </div>

            <button
              onClick={createProject}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  New Project
                </>
              )}
            </button>
          </motion.div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onCreate={createProject} creating={creating} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onDelete={(id, name) => setDeleteModal({ id, name })}
                  onRename={(id, name) => setRenameModal({ id, name })}
                  onDuplicate={duplicateProject}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Rename modal */}
      <AnimatePresence>
        {renameModal && (
          <RenameModal
            projectId={renameModal.id}
            currentName={renameModal.name}
            onConfirm={renameProject}
            onCancel={() => setRenameModal(null)}
            isRenaming={isRenaming}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteModal && (
          <DeleteModal
            projectName={deleteModal.name}
            onConfirm={() => deleteProject(deleteModal.id)}
            onCancel={() => setDeleteModal(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
