

<script lang="ts">
export default {
  props: ["html", "highlights"],
  async setup(props) {
    const { parse } = import.meta.server
      ? await import("dom-parse/dist/node.js")
      : await import("dom-parse/dist/browser.js");

    const Tooltip = resolveComponent("Tooltip");
    let html = `<div class="prose max-w-full dark:prose-invert overflow-x-auto px-4">${props.html}</div>`;
    const doc = parse(html) as DocumentFragment;
    function isElement(node: ChildNode): node is Element {
      return node.nodeType === 1;
    }
    function processNode(node?: Element | ChildNode ) : (() => any | null) | null{
      if (!node || typeof node == "undefined") return null;
      if (node.nodeType === 3) {
        const text = node.textContent;
        if (!text) return null;
        const normalizedText = text.replace(/\s+/g, ' ');
        const escapedHighlights = props?.highlights?.map((h: string) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
        if (props?.highlights?.some((highlight: string) => normalizedText.includes(highlight.replace(/\s+/g, ' ')))) {
          const parts = normalizedText.split(new RegExp(`(${escapedHighlights.join('|')})`, "gis"));
          return () =>
            parts.map((part) =>
              props?.highlights?.some((highlight: string) => part?.toLowerCase() === highlight.toLowerCase())
                ? h("mark", { class: "bg-yellow-200 dark:bg-yellow-500" }, part)
                : part
            );
        }
        return text ? () => text : null;
      }

      if (isElement(node)) {
        const tag = node.tagName?.toLowerCase();

        const props: Record<string, string> = {};
      
        Array.from(node.attributes).forEach((attr) => {
          props[attr.name] = attr.value;
        });
        

        const children = Array.from(node.childNodes)
          .map(processNode)
          .filter(Boolean);
        return () =>
          h(
            tag == "tooltip" ? Tooltip : tag,
            props,
            tag == 'tooltip' ? {default:()=> node.textContent} :children.map((child) => child?.())
          );
      }

      return null;
    }

    return processNode(doc.children[0]);
  },
};
</script>
