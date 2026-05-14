"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface ProjectApplication {
  id: string;
  status: string;
  coverLetter?: string | null;
  ownerFeedback?: string | null;
  aiHardScore?: number | null;
  aiFitScore?: number | null;
  aiWeightedScore?: number | null;
  aiScoreSummary?: string | null;
  aiScoreError?: string | null;
  aiScoredAt?: string | null;
  createdAt: string;
  applicant: {
    id: string;
    email: string;
    displayName: string;
    education?: string | null;
    bioShort?: string | null;
    interests?: string[] | null;
    skills?: string[] | null;
    resumeFileName?: string | null;
    resumeSize?: number | null;
    resumeUploadedAt?: string | null;
  };
}

interface OwnedProject {
  id: string;
  title: string;
  description: string;
  researchArea: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  requirements?: string | null;
  capacity: number;
  enrolled: number;
  status: "OPEN" | "CLOSED" | "COMPLETED";
  applicationCount: number;
  applications: ProjectApplication[];
}

interface AiConfig {
  aiAgentEnabled: boolean;
  aiAgentPrompt: string;
  aiHardWeight: number;
  aiFitWeight: number;
}

type ProjectForm = {
  id?: string;
  title: string;
  description: string;
  researchArea: string;
  startTime: string;
  endTime: string;
  location: string;
  requirements: string;
  capacity: number;
};

const emptyForm: ProjectForm = {
  title: "",
  description: "",
  researchArea: "",
  startTime: "",
  endTime: "",
  location: "",
  requirements: "",
  capacity: 1,
};

export function ProfileProjectPanel() {
  const [projects, setProjects] = useState<OwnedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [scoringApplicationId, setScoringApplicationId] = useState<string | null>(null);
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig>({
    aiAgentEnabled: true,
    aiAgentPrompt: "",
    aiHardWeight: 50,
    aiFitWeight: 50,
  });

  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) || null
    : null;
  const selectedApplication = selectedProject && selectedApplicationId
    ? selectedProject.applications.find((application) => application.id === selectedApplicationId) || null
    : null;

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/applications/received");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        if (data.aiConfig) {
          setAiConfig(data.aiConfig);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const startCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (project: OwnedProject) => {
    setForm({
      id: project.id,
      title: project.title,
      description: project.description,
      researchArea: project.researchArea,
      startTime: project.startTime,
      endTime: project.endTime || "",
      location: project.location || "",
      requirements: project.requirements || "",
      capacity: project.capacity,
    });
    setShowForm(true);
  };

  const submitProject = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.researchArea.trim() || !form.startTime.trim()) {
      alert("Please fill in the project title, description, research area, and start time.");
      return;
    }

    setSavingProject(true);
    try {
      const response = await fetch(form.id ? `/api/projects/${form.id}` : "/api/projects", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          researchArea: form.researchArea,
          startTime: form.startTime,
          endTime: form.endTime || null,
          location: form.location || null,
          requirements: form.requirements || null,
          capacity: Number(form.capacity),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to save the project.");
        return;
      }

      setShowForm(false);
      setForm(emptyForm);
      await fetchProjects();
    } finally {
      setSavingProject(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }

    const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((current) => current.filter((project) => project.id !== projectId));
      return;
    }

    alert("Failed to delete the project.");
  };

  const toggleStatus = async (project: OwnedProject) => {
    const status = project.status === "OPEN" ? "CLOSED" : "OPEN";
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, status } : item));
    }
  };

  const saveAiConfig = async () => {
    setSavingAiConfig(true);
    try {
      const hardWeight = Math.max(0, Math.min(100, Number(aiConfig.aiHardWeight)));
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiAgentEnabled: aiConfig.aiAgentEnabled,
          aiAgentPrompt: aiConfig.aiAgentPrompt,
          aiHardWeight: hardWeight,
          aiFitWeight: 100 - hardWeight,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to save AI settings.");
        return;
      }

      setAiConfig((current) => ({
        ...current,
        aiHardWeight: hardWeight,
        aiFitWeight: 100 - hardWeight,
      }));
      await fetchProjects();
    } finally {
      setSavingAiConfig(false);
    }
  };

  const updateApplication = async (
    application: ProjectApplication,
    status: "pending" | "accepted" | "rejected",
    ownerFeedback: string | null,
  ) => {
    setUpdatingApplicationId(application.id);
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(ownerFeedback !== null && { ownerFeedback }),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to update the application.");
        return;
      }

      await fetchProjects();
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const decideApplication = async (application: ProjectApplication, status: "accepted" | "rejected") => {
    const nextStatus = application.status === status ? "pending" : status;
    await updateApplication(application, nextStatus, application.ownerFeedback || null);
  };

  const editFeedback = async (application: ProjectApplication) => {
    if (application.status !== "accepted" && application.status !== "rejected") {
      alert("Accept or reject this application before adding feedback.");
      return;
    }

    const feedback = window.prompt("Write feedback for the applicant (optional):", application.ownerFeedback || "");
    if (feedback === null) {
      return;
    }

    await updateApplication(application, application.status as "accepted" | "rejected", feedback.trim() || null);
  };

  const scoreApplication = async (application: ProjectApplication) => {
    setScoringApplicationId(application.id);
    try {
      const response = await fetch(`/api/applications/${application.id}/score`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "AI scoring failed.");
        return;
      }

      await fetchProjects();
    } finally {
      setScoringApplicationId(null);
    }
  };

  const openResume = (applicationId: string) => {
    window.open(`/api/applications/${applicationId}/resume`, "_blank", "noopener,noreferrer");
  };

  const statusText = (status: string) => {
    switch (status) {
      case "pending": return "Pending";
      case "accepted": return "Accepted";
      case "rejected": return "Rejected";
      case "WITHDRAWN": return "Withdrawn";
      default: return status;
    }
  };

  const statusClassName = (status: string) => {
    switch (status) {
      case "pending": return "border-yellow-200 bg-yellow-50 text-yellow-800";
      case "accepted": return "border-green-200 bg-green-50 text-green-800";
      case "rejected": return "border-red-200 bg-red-50 text-red-700";
      case "WITHDRAWN": return "border-[#E0D8CC] bg-[#F5F2ED] text-[#6B6B6B]";
      default: return "border-[#E0D8CC] bg-[#F5F2ED] text-[#1A1A1A]";
    }
  };

  const formatDate = (dateValue?: string | null) => {
    if (!dateValue) return "";
    return new Date(dateValue).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (size?: number | null) => {
    if (!size) return "";
    return size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return <p className="py-6 text-sm text-[#1A1A1A]">Loading projects...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[#1A1A1A]">Publish and edit projects, then review and manage incoming applications.</p>
          <p className="mt-1 text-xs text-[#4A4A4A]">
            AI weights: academic strength {aiConfig.aiHardWeight}% · project fit {aiConfig.aiFitWeight}%
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={startCreate}>New project</Button>
      </div>

      <div className="rounded border border-[#A8D0E8] bg-[#EBF3F8] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={aiConfig.aiAgentEnabled}
                  onChange={(event) => setAiConfig((current) => ({ ...current, aiAgentEnabled: event.target.checked }))}
                />
                AI resume scoring
              </label>
              <span className="text-xs text-[#4A4A4A]">
                Academic strength {aiConfig.aiHardWeight}% · project fit {aiConfig.aiFitWeight}%
              </span>
            </div>

            <label className="mt-4 grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              Weight slider
              <input
                type="range"
                min={0}
                max={100}
                value={aiConfig.aiHardWeight}
                onChange={(event) => {
                  const hardWeight = Number(event.target.value);
                  setAiConfig((current) => ({
                    ...current,
                    aiHardWeight: hardWeight,
                    aiFitWeight: 100 - hardWeight,
                  }));
                }}
              />
            </label>

            <label className="mt-4 grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              Custom screening preference
              <textarea
                value={aiConfig.aiAgentPrompt}
                rows={3}
                placeholder="Example: prioritize applicants with publications, independent research experience, or especially strong alignment with this project."
                onChange={(event) => setAiConfig((current) => ({ ...current, aiAgentPrompt: event.target.value }))}
                className="rounded border border-[#A8D0E8] bg-white px-3 py-2 font-normal text-[#1A1A1A] outline-none focus:border-[#2C5F7C]"
              />
            </label>
          </div>

          <Button variant="outline" size="sm" disabled={savingAiConfig} onClick={saveAiConfig}>
            {savingAiConfig ? "Saving..." : "Save AI settings"}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              Project title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              Research area
              <input value={form.researchArea} onChange={(event) => setForm({ ...form, researchArea: event.target.value })} className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              Start time
              <input value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} placeholder="2026-09" className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              End time
              <input value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} placeholder="Optional" className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              Location
              <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#1A1A1A]">
              Capacity
              <input type="number" min={1} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-[#1A1A1A]">
            Project description
            <textarea value={form.description} rows={4} onChange={(event) => setForm({ ...form, description: event.target.value })} className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-[#1A1A1A]">
            Application requirements
            <textarea value={form.requirements} rows={3} onChange={(event) => setForm({ ...form, requirements: event.target.value })} className="rounded border border-[#E0D8CC] bg-white px-3 py-2 font-normal text-[#1A1A1A]" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancel</Button>
            <Button variant="gold" size="sm" disabled={savingProject} onClick={submitProject}>
              {savingProject ? "Saving..." : form.id ? "Save project" : "Publish project"}
            </Button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-8 text-center">
          <p className="text-sm font-semibold text-[#1A1A1A]">No projects published yet</p>
          <p className="mt-2 text-sm text-[#1A1A1A]">Once you create your first research project, incoming applications will be managed here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded border border-[#E0D8CC] bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-[16px] font-semibold text-[#1A1A1A]">{project.title}</h4>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${project.status === "OPEN" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {project.status === "OPEN" ? "Open" : project.status === "CLOSED" ? "Closed" : "Completed"}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-[#1A1A1A]">{project.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#1A1A1A]">
                    <span>{project.researchArea}</span>
                    <span>{project.startTime} - {project.endTime || "Ongoing"}</span>
                    <span>{project.enrolled}/{project.capacity} enrolled</span>
                    <span>{project.applicationCount} applications</span>
                    {project.location && <span>{project.location}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedProjectId(project.id)}>View applications</Button>
                  <Button variant="outline" size="sm" onClick={() => startEdit(project)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(project)}>{project.status === "OPEN" ? "Close" : "Reopen"}</Button>
                  <button onClick={() => deleteProject(project.id)} className="rounded border border-red-200 bg-white px-4 py-2 text-sm text-red-700 transition-all hover:border-red-400 hover:bg-red-50">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(26,26,26,0.32)] px-4 py-8" onClick={() => setSelectedProjectId(null)}>
          <section className="max-h-[calc(100vh-64px)] w-full max-w-[860px] overflow-y-auto rounded-[10px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-[#E0D8CC] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#2C5F7C]">Applications</p>
                  <h3 className="font-display text-[28px] font-semibold text-[#1A1A1A]">{selectedProject.title}</h3>
                  <p className="mt-2 text-sm text-[#1A1A1A]">{selectedProject.applications.length} applications</p>
                </div>
                <button
                  className="rounded border border-[#E0D8CC] bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                  onClick={() => {
                    setSelectedProjectId(null);
                    setSelectedApplicationId(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-5">
              {selectedProject.applications.length === 0 ? (
                <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-8 text-center text-sm text-[#1A1A1A]">No applications yet</div>
              ) : selectedProject.applications.map((application) => (
                <article key={application.id} className="rounded border border-[#E0D8CC] bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="font-semibold text-[#1A1A1A]">{application.applicant.displayName}</h4>
                      <p className="mt-1 text-sm text-[#1A1A1A]">{application.applicant.email}</p>
                      {application.applicant.education && <p className="mt-1 text-sm text-[#1A1A1A]">{application.applicant.education}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeof application.aiWeightedScore === "number" && (
                        <span className="rounded border border-[#A8D0E8] bg-[#EBF3F8] px-3 py-1 text-xs font-semibold text-[#2C5F7C]">AI {application.aiWeightedScore}</span>
                      )}
                      <span className={`rounded border px-3 py-1 text-xs font-semibold ${statusClassName(application.status)}`}>{statusText(application.status)}</span>
                      <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-1 text-xs font-semibold text-[#1A1A1A]">{formatDate(application.createdAt)}</span>
                    </div>
                  </div>

                  {application.coverLetter && <p className="mt-4 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-3 text-sm leading-6 text-[#1A1A1A]">{application.coverLetter}</p>}
                  {application.ownerFeedback && <p className="mt-4 rounded border border-[#E0D8CC] bg-[#EBF3F8] p-3 text-sm leading-6 text-[#1A1A1A]"><span className="font-semibold">Feedback:</span> {application.ownerFeedback}</p>}
                  <div className="mt-4 rounded border border-[#A8D0E8] bg-[#EBF3F8] p-3 text-sm leading-6 text-[#1A1A1A]">
                    <p className="font-semibold">AI resume score</p>
                    {typeof application.aiWeightedScore === "number" ? (
                      <div className="mt-1 grid gap-1">
                        <p>Total {application.aiWeightedScore} · Academic strength {application.aiHardScore ?? "-"} · Project fit {application.aiFitScore ?? "-"}</p>
                        {application.aiScoreSummary && <p>{application.aiScoreSummary}</p>}
                        {application.aiScoredAt && <p className="text-xs text-[#4A4A4A]">Scored on: {formatDate(application.aiScoredAt)}</p>}
                      </div>
                    ) : (
                      <p className="mt-1">{application.aiScoreError || "Not scored yet. Scoring is available after the applicant uploads a PDF resume."}</p>
                    )}
                  </div>

                  {(application.applicant.interests || application.applicant.skills) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(application.applicant.interests || []).slice(0, 5).map((interest) => (
                        <span key={interest} className="rounded bg-[#F5F2ED] px-2 py-1 text-xs text-[#1A1A1A]">{interest}</span>
                      ))}
                      {(application.applicant.skills || []).slice(0, 5).map((skill) => (
                        <span key={skill} className="rounded bg-[#EBF3F8] px-2 py-1 text-xs text-[#1A1A1A]">{skill}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedApplicationId(application.id)}>
                      View applicant details
                    </Button>
                    <Button variant="outline" size="sm" disabled={!application.applicant.resumeFileName} onClick={() => openResume(application.id)}>
                      {application.applicant.resumeFileName ? `View resume ${formatFileSize(application.applicant.resumeSize)}` : "No resume uploaded"}
                    </Button>
                    <Button variant="outline" size="sm" disabled={scoringApplicationId === application.id || !application.applicant.resumeFileName} onClick={() => scoreApplication(application)}>
                      {scoringApplicationId === application.id ? "Scoring..." : "Run AI score"}
                    </Button>
                    {(application.status === "accepted" || application.status === "rejected") && (
                      <Button variant="outline" size="sm" disabled={updatingApplicationId === application.id} onClick={() => editFeedback(application)}>
                        {application.ownerFeedback ? "Edit feedback" : "Add feedback"}
                      </Button>
                    )}
                    {application.status !== "WITHDRAWN" && (
                      <>
                        <button disabled={updatingApplicationId === application.id} onClick={() => decideApplication(application, "accepted")} className="rounded border border-green-200 bg-white px-4 py-2 text-sm text-green-800 hover:border-green-400 hover:bg-green-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED]">
                          {application.status === "accepted" ? "Undo accept" : "Accept"}
                        </button>
                        <button disabled={updatingApplicationId === application.id} onClick={() => decideApplication(application, "rejected")} className="rounded border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED]">
                          {application.status === "rejected" ? "Undo reject" : "Reject"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {selectedApplication && (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-[rgba(26,26,26,0.38)] px-4 py-8"
          onClick={() => setSelectedApplicationId(null)}
        >
          <section
            className="max-h-[calc(100vh-64px)] w-full max-w-[700px] overflow-y-auto rounded-[10px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#E0D8CC] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#2C5F7C]">Applicant profile</p>
                  <h3 className="font-display text-[28px] font-semibold text-[#1A1A1A]">{selectedApplication.applicant.displayName}</h3>
                  <p className="mt-2 text-sm text-[#1A1A1A]">{selectedApplication.applicant.email}</p>
                </div>
                <button className="rounded border border-[#E0D8CC] bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={() => setSelectedApplicationId(null)}>Close</button>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 text-sm leading-6 text-[#1A1A1A]">
              <div className="grid gap-2 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <p><span className="font-semibold">Application status:</span> {statusText(selectedApplication.status)}</p>
                <p><span className="font-semibold">Applied on:</span> {formatDate(selectedApplication.createdAt)}</p>
                {selectedApplication.applicant.education && (
                  <p><span className="font-semibold">Education:</span> {selectedApplication.applicant.education}</p>
                )}
              </div>

              <div className="rounded border border-[#A8D0E8] bg-[#EBF3F8] p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">AI resume score</p>
                    <p className="mt-1 text-xs text-[#4A4A4A]">Current weights: academic strength {aiConfig.aiHardWeight}% · project fit {aiConfig.aiFitWeight}%</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={scoringApplicationId === selectedApplication.id || !selectedApplication.applicant.resumeFileName}
                    onClick={() => scoreApplication(selectedApplication)}
                  >
                    {scoringApplicationId === selectedApplication.id ? "Scoring..." : "Re-score"}
                  </Button>
                </div>
                {typeof selectedApplication.aiWeightedScore === "number" ? (
                  <div className="grid gap-2">
                    <p className="text-[20px] font-semibold text-[#1A1A1A]">Total score {selectedApplication.aiWeightedScore}</p>
                    <p>Academic strength: {selectedApplication.aiHardScore ?? "-"} · Project fit: {selectedApplication.aiFitScore ?? "-"}</p>
                    {selectedApplication.aiScoreSummary && <p>{selectedApplication.aiScoreSummary}</p>}
                    {selectedApplication.aiScoredAt && <p className="text-xs text-[#4A4A4A]">Scored on: {formatDate(selectedApplication.aiScoredAt)}</p>}
                  </div>
                ) : (
                  <p>{selectedApplication.aiScoreError || "Not scored yet. Scoring is available after the applicant uploads a PDF resume."}</p>
                )}
              </div>

              <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <p className="mb-2 font-semibold">PDF resume</p>
                {selectedApplication.applicant.resumeFileName ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p>{selectedApplication.applicant.resumeFileName}</p>
                      <p className="mt-1 text-xs text-[#4A4A4A]">
                        {selectedApplication.applicant.resumeSize ? formatFileSize(selectedApplication.applicant.resumeSize) : "Unknown file size"}
                        {selectedApplication.applicant.resumeUploadedAt ? ` · Uploaded on ${formatDate(selectedApplication.applicant.resumeUploadedAt)}` : ""}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openResume(selectedApplication.id)}>View resume contents</Button>
                  </div>
                ) : (
                  <p>The applicant has not uploaded a resume yet.</p>
                )}
              </div>

              {selectedApplication.applicant.bioShort && (
                <div>
                  <p className="mb-2 font-semibold">Applicant bio</p>
                  <p>{selectedApplication.applicant.bioShort}</p>
                </div>
              )}

              {selectedApplication.coverLetter && (
                <div>
                  <p className="mb-2 font-semibold">Application note</p>
                  <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">{selectedApplication.coverLetter}</div>
                </div>
              )}

              {selectedApplication.ownerFeedback && (
                <div>
                  <p className="mb-2 font-semibold">Owner feedback</p>
                  <div className="rounded border border-[#E0D8CC] bg-[#EBF3F8] p-4">{selectedApplication.ownerFeedback}</div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2 font-semibold">Research interests</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApplication.applicant.interests || []).length > 0 ? (
                      (selectedApplication.applicant.interests || []).map((interest) => (
                        <span key={interest} className="rounded bg-[#F5F2ED] px-2 py-1 text-xs text-[#1A1A1A]">{interest}</span>
                      ))
                    ) : (
                      <span className="text-sm text-[#1A1A1A]">Not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-semibold">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApplication.applicant.skills || []).length > 0 ? (
                      (selectedApplication.applicant.skills || []).map((skill) => (
                        <span key={skill} className="rounded bg-[#EBF3F8] px-2 py-1 text-xs text-[#1A1A1A]">{skill}</span>
                      ))
                    ) : (
                      <span className="text-sm text-[#1A1A1A]">Not provided</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedApplication.status !== "WITHDRAWN" && (
                <div className="flex flex-wrap gap-2 border-t border-[#E0D8CC] pt-5">
                  {(selectedApplication.status === "accepted" || selectedApplication.status === "rejected") && (
                    <Button variant="outline" size="sm" disabled={updatingApplicationId === selectedApplication.id} onClick={() => editFeedback(selectedApplication)}>
                        {selectedApplication.ownerFeedback ? "Edit feedback" : "Add feedback"}
                    </Button>
                  )}
                  <button disabled={updatingApplicationId === selectedApplication.id} onClick={() => decideApplication(selectedApplication, "accepted")} className="rounded border border-green-200 bg-white px-4 py-2 text-sm text-green-800 hover:border-green-400 hover:bg-green-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED]">
                    {selectedApplication.status === "accepted" ? "Undo accept" : "Accept application"}
                  </button>
                  <button disabled={updatingApplicationId === selectedApplication.id} onClick={() => decideApplication(selectedApplication, "rejected")} className="rounded border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED]">
                    {selectedApplication.status === "rejected" ? "Undo reject" : "Reject application"}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
