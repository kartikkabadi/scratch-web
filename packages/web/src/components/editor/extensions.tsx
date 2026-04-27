import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import type { NoteMetadata } from "@scratch-web/shared";
import { getSlashItems, SlashCommandList, type SlashItem } from "./SlashCommand";
import { getWikilinkItems, WikilinkSuggestionList, type WikilinkItem } from "./WikilinkSuggestion";
import { SuggestionPopupManager } from "./SuggestionPopup";

const slashPluginKey = new PluginKey("slashCommand");
const wikilinkPluginKey = new PluginKey("wikilinkSuggestion");

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    const manager = new SuggestionPopupManager<SlashItem>((state) => {
      if (!state.active) return null;
      return (
        <div
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            padding: "4px",
            minWidth: "180px",
            overflow: "hidden",
          }}
        >
          <div data-suggestion-list>
            <SlashCommandList items={state.items} command={state.command} />
          </div>
        </div>
      );
    });
    return [
      Suggestion({
        pluginKey: slashPluginKey,
        editor: this.editor,
        char: "/",
        allowedPrefixes: [" ", ""],
        items: ({ query }) => getSlashItems(query),
        command: ({ editor, range, props }) => {
          props.command(editor, range);
        },
        render: manager.getRenderer(),
      }),
    ];
  },
});

export const WikilinkSuggestionExtension = Extension.create<{ notes: NoteMetadata[] }>({
  name: "wikilinkSuggestion",
  addOptions() {
    return { notes: [] };
  },
  addProseMirrorPlugins() {
    const notes = this.options.notes;
    const manager = new SuggestionPopupManager<WikilinkItem>((state) => {
      if (!state.active) return null;
      return (
        <div
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            padding: "4px",
            minWidth: "200px",
            overflow: "hidden",
          }}
        >
          <div data-suggestion-list>
            <WikilinkSuggestionList items={state.items} command={state.command} />
          </div>
        </div>
      );
    });
    return [
      Suggestion({
        pluginKey: wikilinkPluginKey,
        editor: this.editor,
        char: "[",
        allowToIncludeChar: true,
        allowedPrefixes: null,
        items: ({ query }) => {
          if (!query.startsWith("[")) return [];
          return getWikilinkItems(query, notes);
        },
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).insertContent(`[[${props.title}]]`).run();
        },
        render: manager.getRenderer(),
      }),
    ];
  },
});
