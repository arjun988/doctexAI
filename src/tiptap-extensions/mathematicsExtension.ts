/**
 * Wraps our patched {@link MathematicsPlugin}; options match @tiptap/extension-mathematics.
 */
import { Extension } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

import { MathematicsPlugin } from "./mathematicsPlugin";

export const defaultShouldRender = (state: EditorState, pos: number) => {
  const $pos = state.doc.resolve(pos);
  return $pos.parent.type.name !== "codeBlock";
};

export const Mathematics = Extension.create({
  name: "Mathematics",

  addOptions() {
    return {
      regex: /\$([^\$]*)\$/gi,
      katexOptions: undefined,
      shouldRender: defaultShouldRender,
    };
  },

  addProseMirrorPlugins() {
    return [MathematicsPlugin({ ...this.options, editor: this.editor })];
  },
});

export default Mathematics;
