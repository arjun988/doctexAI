declare module "katex/dist/contrib/auto-render.mjs" {
  export interface RenderMathInElementOptions {
    delimiters?: { left: string; right: string; display: boolean }[];
    throwOnError?: boolean;
    errorColor?: string;
    [key: string]: unknown;
  }
  export default function renderMathInElement(
    elem: HTMLElement,
    options?: RenderMathInElementOptions
  ): void;
}
