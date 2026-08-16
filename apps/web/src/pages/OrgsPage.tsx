import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { api, type MemberRow, type OrgRow, type ProjectRow, type RoleName } from "../api";
import { useSession } from "../session";
import { PageHead } from "../shell/PageHead";

const TOKEN_KEY = "dawngrid.token";
const ROLES: RoleName[] = ["viewer", "operator", "admin"];

export function OrgsPage() {
  const { token, me } = useSession();
  const qc = useQueryClient();
  const isAdmin = me?.scope.role === "admin";

  const [orgName, setOrgName] = useState("");
  const [orgErr, setOrgErr] = useState<string | null>(null);

  const [projectOrgId, setProjectOrgId] = useState(me?.scope.orgId ?? "");
  const [projectName, setProjectName] = useState("");
  const [projectErr, setProjectErr] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState(me?.scope.projectId ?? "");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<RoleName>("viewer");
  const [memberErr, setMemberErr] = useState<string | null>(null);
  const [switchErr, setSwitchErr] = useState<string | null>(null);

  const orgsQuery = useQuery({
    queryKey: ["orgs"],
    enabled: Boolean(token),
    queryFn: () => api<{ orgs: OrgRow[] }>("/api/orgs", { token }),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    enabled: Boolean(token),
    queryFn: () => api<{ projects: ProjectRow[] }>("/api/projects", { token }),
  });

  const membersQuery = useQuery({
    queryKey: ["members", selectedProjectId],
    enabled: Boolean(token && selectedProjectId),
    queryFn: () => api<{ members: MemberRow[] }>(`/api/projects/${selectedProjectId}/members`, { token }),
  });

  const createOrg = useMutation({
    mutationFn: () =>
      api<OrgRow>("/api/orgs", {
        method: "POST",
        token,
        body: JSON.stringify({ name: orgName }),
      }),
    onSuccess() {
      setOrgName("");
      setOrgErr(null);
      void qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError(error) {
      setOrgErr(error instanceof Error ? error.message : "failed to create org");
    },
  });

  const createProject = useMutation({
    mutationFn: () =>
      api<ProjectRow>("/api/projects", {
        method: "POST",
        token,
        body: JSON.stringify({ orgId: projectOrgId, name: projectName }),
      }),
    onSuccess(row) {
      setProjectName("");
      setProjectErr(null);
      setSelectedProjectId(row.id);
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError(error) {
      setProjectErr(error instanceof Error ? error.message : "failed to create project");
    },
  });

  const addMember = useMutation({
    mutationFn: () =>
      api<MemberRow>(`/api/projects/${selectedProjectId}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({ userId: memberUserId, role: memberRole }),
      }),
    onSuccess() {
      setMemberUserId("");
      setMemberRole("viewer");
      setMemberErr(null);
      void qc.invalidateQueries({ queryKey: ["members", selectedProjectId] });
    },
    onError(error) {
      setMemberErr(error instanceof Error ? error.message : "failed to add member");
    },
  });

  const patchMember = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: RoleName }) =>
      api<MemberRow>(`/api/projects/${selectedProjectId}/members/${userId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ role }),
      }),
    onSuccess() {
      setMemberErr(null);
      void qc.invalidateQueries({ queryKey: ["members", selectedProjectId] });
    },
    onError(error) {
      setMemberErr(error instanceof Error ? error.message : "failed to update role");
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api<{ ok: true }>(`/api/projects/${selectedProjectId}/members/${userId}`, {
        method: "DELETE",
        token,
      }),
    onSuccess() {
      setMemberErr(null);
      void qc.invalidateQueries({ queryKey: ["members", selectedProjectId] });
    },
    onError(error) {
      setMemberErr(error instanceof Error ? error.message : "failed to remove member");
    },
  });

  const switchProject = useMutation({
    mutationFn: (projectId: string) =>
      api<{ token: string; user: unknown; scope: unknown; perms: string[] }>("/api/auth/switch-project", {
        method: "POST",
        token,
        body: JSON.stringify({ projectId }),
      }),
    onSuccess(out) {
      setSwitchErr(null);
      localStorage.setItem(TOKEN_KEY, out.token);
      window.location.reload();
    },
    onError(error) {
      setSwitchErr(error instanceof Error ? error.message : "failed to switch project");
    },
  });

  const orgs = orgsQuery.data?.orgs ?? [];
  const projects = projectsQuery.data?.projects ?? [];
  const members = membersQuery.data?.members ?? [];
  const orgNameById = new Map(orgs.map((org) => [org.id, org.name]));
  const memberBusy = addMember.isPending || patchMember.isPending || removeMember.isPending;
  const currentProjectId = me?.scope.projectId ?? "";

  function onCreateOrg(e: FormEvent) {
    e.preventDefault();
    setOrgErr(null);
    createOrg.mutate();
  }

  function onCreateProject(e: FormEvent) {
    e.preventDefault();
    setProjectErr(null);
    createProject.mutate();
  }

  function onAddMember(e: FormEvent) {
    e.preventDefault();
    setMemberErr(null);
    addMember.mutate();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHead title="Places" hint="Orgs own projects. Pick a project here when you need to switch rooms." />
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Host orgs that own projects.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {orgsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading orgs
            </div>
          ) : orgsQuery.isError ? (
            <p className="text-sm text-destructive">
              {orgsQuery.error instanceof Error ? orgsQuery.error.message : "failed to load orgs"}
            </p>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orgs yet.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {orgs.map((org) => (
                <li key={org.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">{org.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{org.id}</span>
                  {org.id === me?.scope.orgId ? <Badge variant="secondary">current</Badge> : null}
                </li>
              ))}
            </ul>
          )}
          {isAdmin ? (
            <form onSubmit={onCreateOrg}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="org-name">Name</FieldLabel>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme"
                    required
                  />
                </Field>
                {orgErr ? <p className="text-sm text-destructive">{orgErr}</p> : null}
                <Button type="submit" className="self-start" disabled={createOrg.isPending}>
                  {createOrg.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Create org
                </Button>
              </FieldGroup>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Projects belong to an org. Switch scope from the members card.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {projectsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading projects
            </div>
          ) : projectsQuery.isError ? (
            <p className="text-sm text-destructive">
              {projectsQuery.error instanceof Error ? projectsQuery.error.message : "failed to load projects"}
            </p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {projects.map((project) => (
                <li key={project.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">{project.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {orgNameById.get(project.orgId) ?? project.orgId}
                  </span>
                  {project.id === currentProjectId ? <Badge variant="secondary">current</Badge> : null}
                  {project.id === selectedProjectId ? <Badge>selected</Badge> : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    Members
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {isAdmin ? (
            <form onSubmit={onCreateProject}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="project-org">Org</FieldLabel>
                  <NativeSelect
                    id="project-org"
                    className="w-full"
                    value={projectOrgId}
                    onChange={(e) => setProjectOrgId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select org
                    </option>
                    {orgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="project-name">Name</FieldLabel>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Default"
                    required
                  />
                </Field>
                {projectErr ? <p className="text-sm text-destructive">{projectErr}</p> : null}
                <Button type="submit" className="self-start" disabled={createProject.isPending || !projectOrgId}>
                  {createProject.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Create project
                </Button>
              </FieldGroup>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Pick a project to list members and switch into it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="member-project">Project</FieldLabel>
              <NativeSelect
                id="member-project"
                className="w-full"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setMemberErr(null);
                  setSwitchErr(null);
                }}
              >
                <option value="" disabled>
                  Select project
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {orgNameById.has(project.orgId) ? ` · ${orgNameById.get(project.orgId)}` : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={!selectedProjectId || selectedProjectId === currentProjectId || switchProject.isPending}
                onClick={() => {
                  setSwitchErr(null);
                  switchProject.mutate(selectedProjectId);
                }}
              >
                {switchProject.isPending ? <Spinner data-icon="inline-start" /> : null}
                Use this project
              </Button>
              {selectedProjectId && selectedProjectId === currentProjectId ? (
                <span className="text-sm text-muted-foreground">Already in this project.</span>
              ) : null}
            </div>
            {switchErr ? <p className="text-sm text-destructive">{switchErr}</p> : null}
          </FieldGroup>

          {!selectedProjectId ? (
            <p className="text-sm text-muted-foreground">Select a project to see members.</p>
          ) : membersQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading members
            </div>
          ) : membersQuery.isError ? (
            <p className="text-sm text-destructive">
              {membersQuery.error instanceof Error ? membersQuery.error.message : "failed to load members"}
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {memberErr && !isAdmin ? <p className="text-sm text-destructive">{memberErr}</p> : null}
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {members.map((member) => (
                  <li key={member.userId} className="flex flex-col gap-3 px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="min-w-0 flex-1">{member.displayName}</span>
                      <span className="font-mono text-sm text-primary">{member.username}</span>
                      {isAdmin ? null : <Badge variant="secondary">{member.role}</Badge>}
                      {member.userId === me?.user.id ? <Badge variant="outline">you</Badge> : null}
                    </div>
                    {isAdmin ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <NativeSelect
                          aria-label={`Role for ${member.username}`}
                          className="h-8"
                          value={member.role}
                          disabled={memberBusy}
                          onChange={(e) =>
                            patchMember.mutate({
                              userId: member.userId,
                              role: e.target.value as RoleName,
                            })
                          }
                        >
                          {ROLES.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={memberBusy}
                          onClick={() => removeMember.mutate(member.userId)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin && selectedProjectId ? (
            <form onSubmit={onAddMember}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="member-user-id">User ID</FieldLabel>
                  <Input
                    id="member-user-id"
                    value={memberUserId}
                    onChange={(e) => setMemberUserId(e.target.value)}
                    placeholder="user id"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="member-role">Role</FieldLabel>
                  <NativeSelect
                    id="member-role"
                    className="w-full"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as RoleName)}
                  >
                    {ROLES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {memberErr ? <p className="text-sm text-destructive">{memberErr}</p> : null}
                <Button type="submit" className="self-start" disabled={addMember.isPending}>
                  {addMember.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Add member
                </Button>
              </FieldGroup>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
