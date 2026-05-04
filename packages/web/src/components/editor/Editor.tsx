import {
  useEffect,
  useRef,
  useCallback,
  useState,
} from "react";
import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Extension, InputRule } from "@tiptap/core";
import { lowlight } from "./lowlight";
import { CodeBlockView } from "./CodeBlockView";
import { BlockMathEditor } from "./BlockMathEditor";
import { LinkEditor } from "./LinkEditor";
import { Wikilink } from "./Wikilink";
import { ScratchBlockMath, normalizeBlockMath } from "./MathExtensions";
import { normalizeUrl, isAllowedUrlScheme, sanitizeUrl } from "../../lib/markdown";
import type { EditorActions } from "../../App";
import { FindToolbar } from "./FindToolbar";
import { SlashCommandExtension, WikilinkSuggestionExtension } from "./extensions";
import { useAppData, useAppActions } from "../../context/AppContext";
import { MenuIcon, SettingsIcon } from "../ui/icons";
import { importAsset } from "../../services/api";

const katexMacros: Record<string, string> = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\C": "\\mathbb{C}",
};

function getMarkdown(editorInstance: TiptapEditor | null): string {
  if (!editorInstance) return "";
  const manager = (editorInstance.storage.markdown as Record<string, unknown>)?.manager as
    | { serialize: (json: object) => string }
    | undefined;
  if (manager) {
    try {
      let markdown = manager.serialize(editorInstance.getJSON());
      markdown = markdown.replace(/&nbsp;|&#160;/g, " ");
      return markdown;
    } catch {
      return editorInstance.getText();
    }
  }
  return editorInstance.getText();
}

function parseMarkdown(editorInstance: TiptapEditor | null, md: string): object | null {
  if (!editorInstance) return null;
  const manager = (editorInstance.storage.markdown as Record<string, unknown>)?.manager as
    | { parse: (md: string) => object }
    | undefined;
  if (manager) {
    try {
      return manager.parse(md);
    } catch {
      return null;
    }
  }
  return null;
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`scratch-toolbar-btn${active ? " scratch-toolbar-btn-active" : ""}`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="scratch-toolbar-separator" />;
}

function FormatBar({
  editor,
  onAddLink,
  onAddBlockMath,
  onAddImage,
}: {
  editor: TiptapEditor | null;
  onAddLink: () => void;
  onAddBlockMath: () => void;
  onAddImage: () => void;
}) {
  if (!editor) return null;
  return (
    <div
      className="scrollbar-none scratch-format-bar"
      aria-label="Formatting controls"
    >
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17.3 19c.7-1 1.1-2.2 1.1-3.5 0-1.8-.7-3.3-1.9-4.5M4.8 15.5c-.5-.9-.8-1.9-.8-3 0-2.8 2.2-5 5-5h7.5" />
          <path d="M3 12h18" />
          <path d="M6.8 5c-.8 1-1.3 2.3-1.3 3.7 0 1.8.7 3.3 1.9 4.5M19.2 8.5c.5.9.8 1.9.8 3 0 2.8-2.2 5-5 5H7.5" />
        </svg>
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h8M4 18V6M12 18V6M17 12h3m0 0v6m0-6l-4-4" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h8M4 18V6M12 18V6M16 12a3 3 0 110 6h-1.5M16 12a3 3 0 100-6h-1.5" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h8M4 18V6M12 18V6M16.5 8a2.5 2.5 0 010 5H16v3h4" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 4 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        title="Heading 4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h8M4 18V6M12 18V6M17 8v8M17 12h3" />
        </svg>
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h1v4M4 10h2M3 18h3v-4H3v2h2" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task List"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline Code"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code Block"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockMath")}
        onClick={onAddBlockMath}
        title="Block Math"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4v16M18 4v16M6 12h12" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        active={editor.isActive("link")}
        onClick={onAddLink}
        title="Add Link"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().insertContent("[[").run()}
        title="Insert Wikilink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
        </svg>
      </ToolbarButton>
      <ToolbarButton onClick={onAddImage} title="Insert Image">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8" cy="10" r="1.5" />
          <path d="M21 16l-5-5L5 19" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insert Table"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </ToolbarButton>
    </div>
  );
}

export function Editor({
  focusMode,
  actionsRef,
  onOpenPalette,
  onToggleFocusMode,
}: {
  focusMode?: boolean;
  actionsRef?: React.RefObject<EditorActions | null>;
  onOpenPalette?: () => void;
  onToggleFocusMode?: () => void;
}) {
  const { currentNote, selectedNoteId, reloadVersion, settings, notes } = useAppData();
  const { saveNote, createNote, setSidebarOpen, setView, setError } = useAppActions();
  const [isSaving, setIsSaving] = useState(false);
  const [, setSelectionKey] = useState(0);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceContent, setSourceContent] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const sourceTimeoutRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<TiptapEditor | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const toggleSourceModeRef = useRef<() => void>(() => {});
  const currentNoteIdRef = useRef<string | null>(null);
  const needsSaveRef = useRef(false);
  const loadedNoteIdRef = useRef<string | null>(null);
  const lastSaveRef = useRef<{ noteId: string; content: string } | null>(null);
  const lastReloadVersionRef = useRef(0);

  const [linkPopup, setLinkPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    existingUrl: string;
    initialText?: string;
  } | null>(null);

  const [mathPopup, setMathPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    initialLatex: string;
    onSubmit: (latex: string) => void;
  } | null>(null);

  const manualSave = settings?.saveMode === "manual";

  const getMarkdownFromEditor = useCallback(() => {
    return getMarkdown(editorRef.current);
  }, []);

  const saveImmediately = useCallback(
    async (noteId: string, content: string) => {
      setIsSaving(true);
      try {
        lastSaveRef.current = { noteId, content };
        await saveNote(content);
      } finally {
        setIsSaving(false);
      }
    },
    [saveNote],
  );

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (needsSaveRef.current && editorRef.current && loadedNoteIdRef.current) {
      needsSaveRef.current = false;
      const markdown = getMarkdownFromEditor();
      await saveImmediately(loadedNoteIdRef.current, markdown);
    }
  }, [saveImmediately, getMarkdownFromEditor]);

  const scheduleSave = useCallback(() => {
    if (manualSave) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const savingNoteId = currentNote?.id;
    if (!savingNoteId) return;
    needsSaveRef.current = true;
    saveTimeoutRef.current = window.setTimeout(async () => {
      if (currentNoteIdRef.current !== savingNoteId || !needsSaveRef.current) return;
      if (editorRef.current) {
        needsSaveRef.current = false;
        const markdown = getMarkdownFromEditor();
        await saveImmediately(savingNoteId, markdown);
      }
    }, 500);
  }, [saveImmediately, getMarkdownFromEditor, currentNote?.id, manualSave]);

  const handleSourceChange = useCallback(
    (value: string) => {
      setSourceContent(value);
      if (manualSave) return;
      if (sourceTimeoutRef.current) clearTimeout(sourceTimeoutRef.current);
      sourceTimeoutRef.current = window.setTimeout(async () => {
        if (!currentNote?.id) return;
        setIsSaving(true);
        try {
          await saveNote(value);
        } finally {
          setIsSaving(false);
        }
      }, 500);
    },
    [currentNote?.id, saveNote, manualSave],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
        link: false,
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }).configure({ lowlight, defaultLanguage: null }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      Link.configure({
        openOnClick: false,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
        isAllowedUri: (url) => sanitizeUrl(url) !== "",
        shouldAutoLink: (url) => sanitizeUrl(url) !== "",
        HTMLAttributes: { class: "underline cursor-pointer" },
      }),
      Extension.create({
        name: "markdownLinkInputRule",
        addInputRules() {
          return [
            new InputRule({
              find: /\[([^\]]+)\]\(([^)]+)\)$/,
              handler: ({ state, range, match, commands }) => {
                const [, text, rawUrl] = match;
                const url = normalizeUrl(rawUrl);
                if (!isAllowedUrlScheme(url)) {
                  return;
                }
                commands.command(({ tr }) => {
                  const linkMark = state.schema.marks.link.create({ href: url });
                  const textNode = state.schema.text(text, [linkMark]);
                  tr.replaceWith(range.from, range.to, textNode);
                  return true;
                });
              },
            }),
          ];
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({
        table: {
          resizable: false,
          HTMLAttributes: { class: "not-prose" },
        },
      }),
      Markdown.configure({}),
      Wikilink,
      SlashCommandExtension,
      WikilinkSuggestionExtension.configure({ notes }),
      ScratchBlockMath.configure({
        katexOptions: {
          throwOnError: false,
          displayMode: true,
          macros: katexMacros,
        },
        onClick: (_node, pos) => {
          const ed = editorRef.current;
          if (!ed) return;
          const nodeAtPos = ed.state.doc.nodeAt(pos);
          if (!nodeAtPos) return;
          const coords = ed.view.coordsAtPos(pos);
          setMathPopup({
            visible: true,
            x: coords.left,
            y: coords.bottom + 8,
            initialLatex: String(nodeAtPos.attrs.latex ?? ""),
            onSubmit: (latex) => {
              ed.chain().focus().updateBlockMath({ pos, latex }).setTextSelection(pos + nodeAtPos.nodeSize).run();
              setMathPopup(null);
            },
          });
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose max-w-3xl mx-auto focus:outline-none min-h-full px-4 pt-6 pb-24",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Tab") {
          return false;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;
        const text = clipboardData.getData("text/plain");
        if (!text) return false;
        const markdownPatterns =
          /^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|```|^\s*\[.*\]\(.*\)|^\s*!\[|\*\*.*\*\*|__.*__|~~.*~~|^\s*[-*_]{3,}\s*$|^\|.+\||\$\$[\s\S]+?\$\$/m;
        if (!markdownPatterns.test(text)) return false;
        const currentEditor = editorRef.current;
        if (!currentEditor) return false;
        const manager = (currentEditor.storage.markdown as Record<string, unknown>)?.manager as
          | { parse: (md: string) => object }
          | undefined;
        if (manager) {
          try {
            const parsed = manager.parse(text);
            if (parsed) {
              currentEditor.commands.insertContent(parsed);
              return true;
            }
          } catch {
            return false;
          }
        }
        return false;
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
    },
    onUpdate: () => {
      if (isLoadingRef.current) return;
      scheduleSave();
    },
    onSelectionUpdate: () => {
      setSelectionKey((k) => k + 1);
    },
    immediatelyRender: false,
  });

  currentNoteIdRef.current = currentNote?.id ?? null;

  const handleAddLink = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    setMathPopup(null);
    const existingUrl = ed.getAttributes("link").href || "";
    const { from, to } = ed.state.selection;
    const hasSelection = from !== to;
    const coords = ed.view.coordsAtPos(from);
    setLinkPopup({
      visible: true,
      x: coords.left,
      y: coords.bottom + 8,
      existingUrl,
      initialText: hasSelection ? ed.state.doc.textBetween(from, to) : undefined,
    });
  }, []);

  const handleAddBlockMath = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    setLinkPopup(null);
    const { from, to } = ed.state.selection;
    const selectedText = from === to ? "" : ed.state.doc.textBetween(from, to, "\n");
    const coords = ed.view.coordsAtPos(from);
    setMathPopup({
      visible: true,
      x: coords.left,
      y: coords.bottom + 8,
      initialLatex: normalizeBlockMath(selectedText),
      onSubmit: (latex) => {
        const trimmed = latex.trim();
        if (!trimmed) return;
        ed.chain().focus().insertContentAt({ from, to }, { type: "blockMath", attrs: { latex: trimmed } }).run();
        setMathPopup(null);
      },
    });
  }, []);

  const handleAddImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const allowedTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
      if (!allowedTypes.has(file.type)) {
        setError("Images must be PNG, JPEG, GIF, or WebP.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Images must be 10MB or smaller.");
        return;
      }
      const ed = editorRef.current;
      if (!ed) return;
      setIsSaving(true);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read image."));
          reader.readAsDataURL(file);
        });
        const dataBase64 = dataUrl.split(",", 2)[1] ?? "";
        const asset = await importAsset({ filename: file.name, mimeType: file.type, dataBase64 });
        ed.chain().focus().setImage({ src: asset.url, alt: asset.filename }).run();
        scheduleSave();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to import image.");
      } finally {
        setIsSaving(false);
      }
    },
    [scheduleSave, setError],
  );

  useEffect(() => {
    if (!currentNote || !editor) {
      return;
    }
    const isSameNote = currentNote.id === loadedNoteIdRef.current;

    if (!isSameNote) {
      const lastSave = lastSaveRef.current;
      if (
        lastSave?.noteId === loadedNoteIdRef.current &&
        lastSave?.content === currentNote.content
      ) {
        loadedNoteIdRef.current = currentNote.id;
        if (needsSaveRef.current) {
          flushPendingSave();
        }
        return;
      }
    }

    if (!isSameNote && needsSaveRef.current) {
      flushPendingSave();
    }

    if (!isSameNote) {
      setSourceMode(false);
      if (sourceTimeoutRef.current) {
        clearTimeout(sourceTimeoutRef.current);
        sourceTimeoutRef.current = null;
      }
    }

    const isManualReload = reloadVersion !== lastReloadVersionRef.current;

    if (isSameNote) {
      if (isManualReload) {
        lastReloadVersionRef.current = reloadVersion;
        isLoadingRef.current = true;
        const parsed = parseMarkdown(editor, currentNote.content);
        if (parsed) {
          editor.commands.setContent(parsed);
        } else {
          editor.commands.setContent(currentNote.content);
        }
        isLoadingRef.current = false;
        return;
      }
      return;
    }

    const loadingNoteId = currentNote.id;
    loadedNoteIdRef.current = loadingNoteId;
    isLoadingRef.current = true;
    editor.commands.blur();
    const parsed = parseMarkdown(editor, currentNote.content);
    if (parsed) {
      editor.commands.setContent(parsed);
    } else {
      editor.commands.setContent(currentNote.content);
    }
    scrollContainerRef.current?.scrollTo?.(0, 0);
    requestAnimationFrame(() => {
      if (loadedNoteIdRef.current !== loadingNoteId) return;
      scrollContainerRef.current?.scrollTo?.(0, 0);
      isLoadingRef.current = false;
      if (currentNote.content.trim() === "") {
        editor.commands.focus("start");
        editor.commands.selectAll();
      }
    });
  }, [currentNote, editor, flushPendingSave, reloadVersion]);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo?.(0, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (needsSaveRef.current && editorRef.current) {
        needsSaveRef.current = false;
        const markdown = getMarkdown(editorRef.current);
        void saveNote(markdown);
      }
    };
  }, [saveNote]);

  useEffect(() => {
    if (!editor) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wikilinkEl = target.closest("[data-wikilink]");
      if (wikilinkEl) {
        e.preventDefault();
        return;
      }
      const link = target.closest("a");
      if (link) {
        e.preventDefault();
        if ((e.metaKey || e.ctrlKey) && link.href) {
          const rawHref = link.getAttribute("href") ?? "";
          const normalizedHref = normalizeUrl(rawHref);
          if (isAllowedUrlScheme(normalizedHref)) {
            window.open(normalizedHref, "_blank", "noopener,noreferrer");
          }
        }
      }
    };
    const el = editor.view.dom;
    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [editor]);

  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
          e.preventDefault();
          toggleSourceModeRef.current();
        }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && !e.shiftKey) {
        e.preventDefault();
        setFindOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        toggleSourceMode: () => toggleSourceModeRef.current(),
        openFind: () => setFindOpen(true),
      };
    }
    return () => {
      if (actionsRef) {
        actionsRef.current = null;
      }
    };
  }, [actionsRef]);

  const handleManualSave = useCallback(async () => {
    if (!currentNote?.id) return;
    if (sourceMode) {
      setIsSaving(true);
      try {
        await saveNote(sourceContent);
      } finally {
        setIsSaving(false);
      }
    } else {
      const markdown = getMarkdownFromEditor();
      await saveImmediately(currentNote.id, markdown);
    }
  }, [currentNote?.id, sourceMode, sourceContent, saveNote, saveImmediately, getMarkdownFromEditor]);

  const toggleSourceMode = useCallback(() => {
    if (sourceMode) {
      const ed = editorRef.current;
      if (ed) {
        isLoadingRef.current = true;
        const parsed = parseMarkdown(ed, sourceContent);
        if (parsed) {
          ed.commands.setContent(parsed);
        } else {
          ed.commands.setContent(sourceContent);
        }
        requestAnimationFrame(() => {
          isLoadingRef.current = false;
          ed.commands.focus();
        });
      }
      setSourceMode(false);
      scheduleSave();
      return;
    }
    setSourceContent(getMarkdownFromEditor());
    setSourceMode(true);
  }, [getMarkdownFromEditor, scheduleSave, sourceContent, sourceMode]);

  toggleSourceModeRef.current = toggleSourceMode;

  const handleSourceKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
      e.preventDefault();
      toggleSourceMode();
    }
  }, [toggleSourceMode]);

  return (
    <div className="scratch-editor">
      {focusMode && onToggleFocusMode && (
        <button
          onClick={onToggleFocusMode}
          title="Exit focus mode"
          className="scratch-focus-exit-btn"
        >
          Exit Focus
        </button>
      )}
      <div
        className={`scratch-editor-toolbar${focusMode ? " scratch-editor-toolbar-hidden" : ""}`}
      >
        <div className="scratch-editor-toolbar-main">
          <button
            onClick={() => setSidebarOpen(true)}
            className="scratch-action-btn"
            title="Open sidebar"
          >
            <MenuIcon style={{ width: 18, height: 18 }} />
          </button>
          <div className="scratch-toolbar-separator" />
          {selectedNoteId && !sourceMode && editor && (
            <FormatBar
              editor={editor}
              onAddLink={handleAddLink}
              onAddBlockMath={handleAddBlockMath}
              onAddImage={handleAddImage}
            />
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            style={{ display: "none" }}
            onChange={(event) => {
              void handleImageFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <div className="scratch-editor-toolbar-actions">
          {selectedNoteId && isSaving && (
            <span className="scratch-saving-indicator">
              Saving...
            </span>
          )}
          {selectedNoteId && manualSave && (
            <button
              onClick={handleManualSave}
              className="scratch-action-btn-bordered"
            >
              Save
            </button>
          )}
          {selectedNoteId && (
            <button
              data-testid="source-mode-toggle"
              type="button"
              onClick={toggleSourceMode}
              aria-label={sourceMode ? "Switch to visual editor" : "Switch to source editor"}
              className={`scratch-action-btn-bordered${sourceMode ? " scratch-action-btn-bordered-active" : ""}`}
            >
              {sourceMode ? "Visual" : "Source"}
            </button>
          )}
          <button
            onClick={() => setView("settings")}
            className="scratch-action-btn"
            title="Settings"
          >
            <SettingsIcon style={{ width: 18, height: 18 }} />
          </button>
          {onOpenPalette && (
            <button
              onClick={onOpenPalette}
              title="Command palette"
              className="scratch-action-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {selectedNoteId ? (
        <div
          className="scratch-editor-body"
          ref={scrollContainerRef}
        >
          {sourceMode ? (
            <textarea
              data-testid="source-editor"
              aria-label="Markdown source"
              value={sourceContent}
              onChange={(e) => {
                handleSourceChange(e.target.value);
              }}
              onKeyDown={handleSourceKeyDown}
              spellCheck={false}
              className="scratch-source-textarea"
            />
          ) : (
            <EditorContent editor={editor} />
          )}

          {linkPopup?.visible && (
            <div
              style={{
                position: "fixed",
                left: linkPopup.x,
                top: linkPopup.y,
                zIndex: 100,
              }}
            >
              <LinkEditor
                initialUrl={linkPopup.existingUrl}
                initialText={linkPopup.initialText}
                onSubmit={(url, text) => {
                  const ed = editorRef.current;
                  if (!ed) return;
                  const normalized = sanitizeUrl(url);
                  if (!normalized) {
                    setError("Only http, https, and mailto links are supported.");
                    setLinkPopup(null);
                    return;
                  }
                  if (text) {
                    ed.chain().focus().insertContent({
                      type: "text",
                      text,
                      marks: [{ type: "link", attrs: { href: normalized } }],
                    }).run();
                  } else {
                    const { from, to } = ed.state.selection;
                    if (from !== to) {
                      ed.chain().focus().setLink({ href: normalized }).run();
                    } else {
                      ed.chain().focus().insertContent({
                        type: "text",
                        text: normalized,
                        marks: [{ type: "link", attrs: { href: normalized } }],
                      }).run();
                    }
                  }
                  setLinkPopup(null);
                  scheduleSave();
                }}
                onRemove={() => {
                  editorRef.current?.chain().focus().unsetLink().run();
                  setLinkPopup(null);
                  scheduleSave();
                }}
                onCancel={() => setLinkPopup(null)}
              />
            </div>
          )}

          {mathPopup?.visible && (
            <div
              style={{
                position: "fixed",
                left: mathPopup.x,
                top: mathPopup.y,
                zIndex: 100,
              }}
            >
              <BlockMathEditor
                initialLatex={mathPopup.initialLatex}
                onSubmit={(latex) => {
                  mathPopup.onSubmit(latex);
                  scheduleSave();
                }}
                onCancel={() => setMathPopup(null)}
              />
            </div>
          )}
          <FindToolbar open={findOpen} onClose={() => setFindOpen(false)} containerRef={scrollContainerRef} />
        </div>
      ) : (
        <div className="scratch-empty-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="scratch-empty-state-icon"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <p className="scratch-empty-state-title">
            What&apos;s on your mind?
          </p>
          <p className="scratch-empty-state-subtitle">
            Select a note or create a new one
          </p>
          <button
            onClick={() => void createNote()}
            className="scratch-empty-state-btn"
          >
            New Note
          </button>
        </div>
      )}
    </div>
  );
}
