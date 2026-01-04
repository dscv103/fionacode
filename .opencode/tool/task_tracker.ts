import { tool } from "@opencode-ai/plugin";
import { randomUUID } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import process from "node:process";

type Status = "todo" | "in_progress" | "blocked" | "done";

type Blocker = {
  id: string;
  reason: string;
  created_at: string;
};

type Artifact = {
  path: string;
  type?: string;
  note?: string;
  created_at: string;
};

type TaskNode = {
  id: string;
  title: string;
  status: Status;
  deps: string[];
  blockers: Blocker[];
  artifacts: Artifact[];
  created_at: string;
  updated_at: string;
};

type State = {
  version: 1;
  updated_at: string;
  tasks: Record<string, TaskNode>;
};

const STATUS_VALUES: Status[] = ["todo", "in_progress", "blocked", "done"];

function nowIso() {
  return new Date().toISOString();
}

function statePath(projectRoot: string) {
  return path.join(projectRoot, ".opencode", "state", "task_tracker.json");
}

async function loadState(filePath: string): Promise<State | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as State;

    if (!parsed || parsed.version !== 1 || typeof parsed.tasks !== "object") {
      throw new Error("Invalid task_tracker state schema");
    }

    return parsed;
  } catch (err: unknown) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

function normalizeState(state: State): State {
  const sortedTaskIds = Object.keys(state.tasks).sort();
  const tasks: Record<string, TaskNode> = {};
  for (const id of sortedTaskIds) {
    tasks[id] = state.tasks[id];
  }

  return {
    version: 1,
    updated_at: state.updated_at,
    tasks,
  };
}

async function saveState(filePath: string, state: State): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });

  const normalized = normalizeState(state);
  const tmpPath = `${filePath}.tmp`;

  await writeFile(tmpPath, JSON.stringify(normalized, null, 2) + "\n", "utf8");
  await rename(tmpPath, filePath);
}

function requireTask(state: State, taskId: string): TaskNode {
  const task = state.tasks[taskId];
  if (!task) throw new Error(`Unknown task_id: ${taskId}`);
  return task;
}

function addUnique(existing: string[], value: string) {
  if (!existing.includes(value)) existing.push(value);
}

export default tool({
  description:
    "Maintain persistent structured state for subtasks, dependencies, blockers, and artifacts.",
  args: {
    action: tool.schema
      .enum([
        "init",
        "create_task",
        "update_task",
        "set_status",
        "link_dep",
        "add_blocker",
        "clear_blocker",
        "attach_artifact",
        "get_snapshot",
      ])
      .describe("Operation to perform"),

    force: tool.schema
      .boolean()
      .optional()
      .describe("If true, overwrite state on init"),

    task_id: tool.schema
      .string()
      .optional()
      .describe("Task UUID (required for most actions)")
      .describe("Task UUID"),

    title: tool.schema.string().optional().describe("Task title"),
    status: tool.schema
      .enum(STATUS_VALUES)
      .optional()
      .describe("Task status"),

    depends_on: tool.schema
      .string()
      .optional()
      .describe("Dependency task UUID"),

    blocker_reason: tool.schema
      .string()
      .optional()
      .describe("Blocker reason"),

    blocker_id: tool.schema
      .string()
      .optional()
      .describe("Blocker UUID"),

    artifact_path: tool.schema
      .string()
      .optional()
      .describe("Artifact path (repo-relative preferred)"),
    artifact_type: tool.schema.string().optional().describe("Artifact type"),
    artifact_note: tool.schema.string().optional().describe("Artifact note"),
  },

  async execute(args, context) {
    const projectRoot = process.cwd();
    const filePath = statePath(projectRoot);

    const existing = await loadState(filePath);
    const state: State = existing ??
      ({
        version: 1,
        updated_at: nowIso(),
        tasks: {},
      } satisfies State);

    const touch = () => {
      state.updated_at = nowIso();
    };

    if (args.action === "init") {
      if (existing && !args.force) {
        return {
          ok: true,
          message:
            "task_tracker already initialized (pass force=true to overwrite)",
          path: filePath,
        };
      }

      const fresh: State = { version: 1, updated_at: nowIso(), tasks: {} };
      await saveState(filePath, fresh);

      return {
        ok: true,
        message: "task_tracker initialized",
        path: filePath,
      };
    }

    if (args.action === "create_task") {
      if (!args.title || !args.title.trim()) {
        throw new Error("create_task requires title");
      }

      const id = randomUUID();
      const ts = nowIso();

      state.tasks[id] = {
        id,
        title: args.title.trim(),
        status: "todo",
        deps: [],
        blockers: [],
        artifacts: [],
        created_at: ts,
        updated_at: ts,
      };

      touch();
      await saveState(filePath, state);

      return { ok: true, task_id: id, path: filePath };
    }

    if (args.action === "get_snapshot") {
      return {
        ok: true,
        path: filePath,
        agent: context.agent,
        sessionID: context.sessionID,
        messageID: context.messageID,
        state,
      };
    }

    if (!args.task_id) {
      throw new Error(`${args.action} requires task_id`);
    }

    if (args.action === "update_task") {
      const task = requireTask(state, args.task_id);

      if (args.title !== undefined) {
        const trimmed = args.title.trim();
        if (!trimmed) throw new Error("title cannot be empty");
        task.title = trimmed;
      }

      if (args.status !== undefined) {
        task.status = args.status;
      }

      task.updated_at = nowIso();
      touch();
      await saveState(filePath, state);

      return { ok: true, task_id: task.id, path: filePath };
    }

    if (args.action === "set_status") {
      if (!args.status) throw new Error("set_status requires status");
      const task = requireTask(state, args.task_id);
      task.status = args.status;
      task.updated_at = nowIso();
      touch();
      await saveState(filePath, state);
      return {
        ok: true,
        task_id: task.id,
        status: task.status,
        path: filePath,
      };
    }

    if (args.action === "link_dep") {
      if (!args.depends_on) throw new Error("link_dep requires depends_on");
      const task = requireTask(state, args.task_id);
      requireTask(state, args.depends_on);
      addUnique(task.deps, args.depends_on);
      task.updated_at = nowIso();
      touch();
      await saveState(filePath, state);
      return { ok: true, task_id: task.id, deps: task.deps, path: filePath };
    }

    if (args.action === "add_blocker") {
      if (!args.blocker_reason || !args.blocker_reason.trim()) {
        throw new Error("add_blocker requires blocker_reason");
      }

      const task = requireTask(state, args.task_id);
      const blocker: Blocker = {
        id: randomUUID(),
        reason: args.blocker_reason.trim(),
        created_at: nowIso(),
      };
      task.blockers.push(blocker);
      task.status = "blocked";
      task.updated_at = nowIso();
      touch();
      await saveState(filePath, state);

      return { ok: true, task_id: task.id, blocker, path: filePath };
    }

    if (args.action === "clear_blocker") {
      const task = requireTask(state, args.task_id);
      if (!args.blocker_id) {
        throw new Error("clear_blocker requires blocker_id");
      }

      const before = task.blockers.length;
      task.blockers = task.blockers.filter((b) => b.id !== args.blocker_id);
      if (task.blockers.length === before) {
        throw new Error(`Unknown blocker_id: ${args.blocker_id}`);
      }

      task.updated_at = nowIso();
      touch();
      await saveState(filePath, state);

      return {
        ok: true,
        task_id: task.id,
        blockers: task.blockers,
        path: filePath,
      };
    }

    if (args.action === "attach_artifact") {
      if (!args.artifact_path || !args.artifact_path.trim()) {
        throw new Error("attach_artifact requires artifact_path");
      }

      const task = requireTask(state, args.task_id);
      const artifact: Artifact = {
        path: args.artifact_path.trim(),
        type: args.artifact_type?.trim() || undefined,
        note: args.artifact_note?.trim() || undefined,
        created_at: nowIso(),
      };

      task.artifacts.push(artifact);
      task.updated_at = nowIso();
      touch();
      await saveState(filePath, state);

      return { ok: true, task_id: task.id, artifact, path: filePath };
    }

    throw new Error(`Unsupported action: ${args.action}`);
  },
});
