export interface Command {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
  execute: () => void | Promise<void>;
}

export interface CommandCategory {
  id: string;
  label: string;
  priority: number;
}

export const COMMAND_CATEGORIES: CommandCategory[] = [
  { id: "notes", label: "Notes", priority: 1 },
  { id: "editor", label: "Editor", priority: 2 },
  { id: "git", label: "Git", priority: 3 },
  { id: "app", label: "App", priority: 4 },
];
