/**
 * Vendored from @tiptap/extension-mathematics (MIT) with two behavior tweaks:
 * 1) Boundary: `to` is exclusive; use `anchor < to` so the caret after the closing `$`
 *    is outside the formula (upstream used `<=`, which fought insert caret placement).
 * 2) Always show the KaTeX widget — never switch to raw LaTeX when the caret is inside.
 *    Users edit via the Equation dialog (toolbar Σ) or by changing the hidden source.
 */
import { getChangedRanges } from "@tiptap/core";
import { EditorState, Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import katex from "katex";

import type { MathematicsOptionsWithEditor } from "@tiptap/extension-mathematics";

type DecoSpec = {
  isEditable: boolean;
  isEditing: boolean;
  katexOptions: MathematicsOptionsWithEditor["katexOptions"];
  content: string;
};

type PluginState =
  | { decorations: DecorationSet; isEditable: boolean }
  | { decorations: undefined; isEditable: undefined };

function getAffectedRange(
  newState: EditorState,
  previousPluginState: PluginState,
  isEditable: boolean,
  tr: Transaction,
  state: EditorState
) {
  const docSize = newState.doc.nodeSize - 2;
  let minFrom = 0;
  let maxTo = docSize;

  if (previousPluginState.isEditable !== isEditable) {
    minFrom = 0;
    maxTo = docSize;
  } else if (tr.docChanged) {
    minFrom = docSize;
    maxTo = 0;

    getChangedRanges(tr).forEach((range) => {
      minFrom = Math.min(minFrom, range.newRange.from - 1, range.oldRange.from - 1);
      maxTo = Math.max(maxTo, range.newRange.to + 1, range.oldRange.to + 1);
    });
  } else if (tr.selectionSet) {
    const { $from, $to } = state.selection;
    const { $from: $newFrom, $to: $newTo } = newState.selection;

    minFrom = Math.min(
      $from.depth === 0 ? 0 : $from.before(),
      $newFrom.depth === 0 ? 0 : $newFrom.before()
    );
    maxTo = Math.max(
      $to.depth === 0 ? maxTo : $to.after(),
      $newTo.depth === 0 ? maxTo : $newTo.after()
    );
  }

  return {
    minFrom: Math.max(minFrom, 0),
    maxTo: Math.min(maxTo, docSize),
  };
}

export const MathematicsPlugin = (options: MathematicsOptionsWithEditor) => {
  const { regex, katexOptions = {}, editor, shouldRender } = options;

  return new Plugin<PluginState>({
    key: new PluginKey("mathematics"),

    state: {
      init() {
        return { decorations: undefined, isEditable: undefined };
      },
      apply(tr, previousPluginState, state, newState) {
        if (!tr.docChanged && !tr.selectionSet && previousPluginState.decorations) {
          return previousPluginState;
        }

        const nextDecorationSet = (previousPluginState.decorations || DecorationSet.empty).map(
          tr.mapping,
          tr.doc
        );
        const isEditable = editor.isEditable;
        const decorationsToAdd: Decoration[] = [];
        const { minFrom, maxTo } = getAffectedRange(
          newState,
          previousPluginState,
          isEditable,
          tr,
          state
        );

        newState.doc.nodesBetween(minFrom, maxTo, (node, pos) => {
          const enabled = shouldRender(newState, pos, node);

          if (node.isText && node.text && enabled) {
            let match = regex.exec(node.text);
            while (match !== null) {
              const from = pos + match.index;
              const to = from + match[0].length;
              const content = match.slice(1).find(Boolean);

              if (content) {
                const isEditing = false;

                if (
                  nextDecorationSet.find(
                    from,
                    to,
                    (deco: DecoSpec) =>
                      isEditing === deco.isEditing &&
                      content === deco.content &&
                      isEditable === deco.isEditable &&
                      katexOptions === deco.katexOptions
                  ).length
                ) {
                  match = regex.exec(node.text);
                  continue;
                }
                decorationsToAdd.push(
                  Decoration.inline(
                    from,
                    to,
                    {
                      class:
                        isEditing && isEditable
                          ? "Tiptap-mathematics-editor"
                          : "Tiptap-mathematics-editor Tiptap-mathematics-editor--hidden",
                      style:
                        !isEditing || !isEditable
                          ? "display: inline-block; height: 0; opacity: 0; overflow: hidden; position: absolute; width: 0;"
                          : undefined,
                    },
                    {
                      content,
                      isEditable,
                      isEditing,
                      katexOptions,
                    } satisfies DecoSpec
                  )
                );

                if (!isEditable || !isEditing) {
                  decorationsToAdd.push(
                    Decoration.widget(
                      from,
                      () => {
                        const element = document.createElement("span");
                        element.classList.add("Tiptap-mathematics-render");
                        if (isEditable) {
                          element.classList.add("Tiptap-mathematics-render--editable");
                        }
                        try {
                          katex.render(content!, element, katexOptions);
                        } catch {
                          element.innerHTML = content!;
                        }
                        return element;
                      },
                      {
                        content,
                        isEditable,
                        isEditing,
                        katexOptions,
                      } satisfies DecoSpec
                    )
                  );
                }
              }
              match = regex.exec(node.text);
            }
          }
        });

        const decorationsToRemove = decorationsToAdd.flatMap((deco) =>
          nextDecorationSet.find(deco.from, deco.to)
        );

        return {
          decorations: nextDecorationSet.remove(decorationsToRemove).add(tr.doc, decorationsToAdd),
          isEditable,
        };
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
  });
};
